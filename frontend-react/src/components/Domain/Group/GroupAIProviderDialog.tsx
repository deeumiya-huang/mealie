// Usage: <GroupAIProviderDialog open={open} onOpenChange={setOpen} providerId={editingId}
//          onCreate={data => …} onUpdate={(id, data) => …} /> — create form, or edit form when `providerId` is set
//          (the provider is fetched when the dialog opens). Includes a "test connection" action.
// Vue `v-model` → `open` + `onOpenChange`, `@create` / `@update` → `onCreate` / `onUpdate`.
import { useEffect, useState, type ComponentProps } from "react";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { AppLoader } from "@/components/global/AppLoader";
import { BaseDialog } from "@/components/global/BaseDialog";
import { BaseKeyValueEditor } from "@/components/global/BaseKeyValueEditor";
import { BaseNumberInput } from "@/components/global/BaseNumberInput";
import { MdiIcon } from "@/components/global/MdiIcon";
import { useAIProviders } from "@/hooks/use-ai-providers";
import { validators } from "@/hooks/use-validators";
import { field, useFormValidation, useNoAutofill } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import type { AIProviderCreate, AIProviderTestResult, AIProviderUpdate } from "@/lib/api/types/group";
import { icons } from "@/lib/icons";

interface GroupAIProviderDialogProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  providerId?: string;
  onCreate?: (data: AIProviderCreate) => void;
  onUpdate?: (id: string, data: AIProviderUpdate) => void;
}

interface FormData {
  name: string;
  model: string;
  apiKey: string;
  baseUrl: string;
  timeout: number | null;
  requestHeaders: Record<string, string>;
  requestParams: Record<string, string>;
}

const defaultForm = (): FormData => ({
  name: "",
  model: "",
  apiKey: "",
  baseUrl: "",
  timeout: 300,
  requestHeaders: {},
  requestParams: {},
});

type HintTextFieldProps = Omit<ComponentProps<typeof TextField>, "variant"> & {
  hint?: string;
  persistentHint?: boolean;
};

// Vuetify shows a `hint` while the field is focused (always with `persistent-hint`); errors replace it.
function HintTextField({ hint, persistentHint = false, helperText, error, onFocus, onBlur, ...props }: HintTextFieldProps) {
  const [focused, setFocused] = useState(false);
  const shownHint = persistentHint || focused ? hint : undefined;
  return (
    <TextField
      {...props}
      variant="outlined"
      size="small"
      fullWidth
      error={error}
      helperText={error ? helperText : shownHint}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      sx={{ mb: 2, ...props.sx }}
    />
  );
}

function compactRecord(record: Record<string, string>) {
  return Object.keys(record).length ? record : undefined;
}

export function GroupAIProviderDialog({ open, onOpenChange, providerId, onCreate, onUpdate }: GroupAIProviderDialogProps) {
  const { t } = useI18n();
  const { loading, getOne, testOne, testSavedOne } = useAIProviders();
  const noAutofill = useNoAutofill<HTMLFormElement>();

  const [init, setInit] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>(defaultForm);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<AIProviderTestResult | null>(null);

  const isEdit = !!providerId;

  const form = useFormValidation({
    name: field(formData.name, [validators.required]),
    model: field(formData.model, [validators.required]),
    apiKey: field(formData.apiKey, isEdit ? [] : [validators.required]),
  });

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setFormData(current => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setFormData(defaultForm());
    form.resetValidation();
    setAdvancedOpen(false);
    setTestResult(null);
  }

  // When the dialog opens (or the provider changes) the form starts empty (create) or waits for the provider (edit)
  const [prevTarget, setPrevTarget] = useState({ open, providerId });
  if (open !== prevTarget.open || providerId !== prevTarget.providerId) {
    setPrevTarget({ open, providerId });
    if (open) {
      setTestResult(null);
      if (!providerId) {
        // Create mode — just show the empty form
        setFormData(defaultForm());
        setInit(true);
      }
      else {
        setInit(false);
      }
    }
  }

  // Fetch the existing provider when editing; a fetch still in flight for a previous provider/dialog state
  // is ignored once the dependencies change, so its stale result can never be applied afterward.
  useEffect(() => {
    if (!open || !providerId) return;
    let active = true;
    void (async () => {
      const { data } = await getOne(providerId);
      if (!active) return;
      setInit(true);
      if (data) {
        setFormData({
          name: data.name,
          model: data.model,
          apiKey: "",
          baseUrl: data.baseUrl ?? "",
          timeout: data.timeout ?? 300,
          requestHeaders: { ...(data.requestHeaders ?? {}) },
          requestParams: { ...(data.requestParams ?? {}) },
        });
      }
    })();
    return () => {
      active = false;
    };
  }, [open, providerId, getOne]);

  const submitDisabled = !formData.name.trim() || !formData.model.trim() || (!isEdit && !formData.apiKey.trim());

  const connectionMessage = (() => {
    if (!testResult) return "";
    if (testResult.success) return t("group.ai-provider-settings.test-connection-succeeded");
    return testResult.message || t("group.ai-provider-settings.test-connection-failed");
  })();

  // Capability info rather than a second pass/fail check - a text-only provider is a valid setup,
  // it just can't be used as the image provider. Appended to the connection message above.
  const imageSupportMessage = (() => {
    if (!testResult?.success) return "";
    return testResult.supportsImages
      ? ` — ${t("group.ai-provider-settings.supports-images")}`
      : ` — ${t("group.ai-provider-settings.text-only-provider")}`;
  })();

  function updatePayload(): AIProviderUpdate & { apiKey?: string } {
    const payload: AIProviderUpdate & { apiKey?: string } = {
      name: formData.name,
      model: formData.model,
      baseUrl: formData.baseUrl || null,
      timeout: formData.timeout ?? undefined,
      requestHeaders: compactRecord(formData.requestHeaders),
      requestParams: compactRecord(formData.requestParams),
    };
    if (formData.apiKey) {
      payload.apiKey = formData.apiKey;
    }
    return payload;
  }

  function createPayload(): AIProviderCreate {
    // The API client types do not list `apiKey`, but the backend requires it on create
    const payload: AIProviderCreate & { apiKey: string } = {
      name: formData.name,
      model: formData.model,
      apiKey: formData.apiKey,
      baseUrl: formData.baseUrl || null,
      timeout: formData.timeout ?? undefined,
      requestHeaders: compactRecord(formData.requestHeaders),
      requestParams: compactRecord(formData.requestParams),
    };
    return payload;
  }

  function handleSubmit() {
    // Required field guard (button is also disabled, but keep as a safeguard)
    if (!formData.name.trim() || !formData.model.trim()) return;
    if (!isEdit && !formData.apiKey.trim()) return;

    if (isEdit && providerId) {
      onUpdate?.(providerId, updatePayload());
    }
    else {
      onCreate?.(createPayload());
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      let data: AIProviderTestResult | null;
      if (isEdit && providerId) {
        // Test the form's CURRENT values, not what's saved in the DB — the user may have just
        // changed the model/base_url. If they left the API key blank (meaning "keep the existing
        // one"), the backend falls back to the saved key since we don't have that value here.
        ({ data } = await testSavedOne(providerId, updatePayload()));
      }
      else {
        ({ data } = await testOne(createPayload()));
      }

      setTestResult(data);
    }
    finally {
      setTesting(false);
    }
  }

  return (
    <BaseDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? t("group.ai-provider-settings.edit-provider") : t("group.ai-provider-settings.create-provider")}
      icon={icons.robot}
      loading={loading}
      canSubmit
      submitIcon={isEdit ? icons.save : icons.createAlt}
      submitText={isEdit ? t("general.update") : t("general.create")}
      submitDisabled={submitDisabled}
      onSubmit={handleSubmit}
      onClose={resetForm}
      customCardAction={(
        <Button
          variant="text"
          loading={testing}
          disabled={submitDisabled || testing}
          onClick={() => void handleTest()}
        >
          {t("group.ai-provider-settings.test-connection")}
        </Button>
      )}
    >
      {init
        ? (
            <CardContent sx={{ maxHeight: "70vh", overflowY: "auto" }}>
              <Box component="form" noValidate ref={noAutofill} onSubmit={event => event.preventDefault()}>
                <HintTextField
                  label={t("group.ai-provider-settings.provider-name")}
                  value={formData.name}
                  margin="dense"
                  {...form.fieldProps("name")}
                  onChange={event => update("name", event.target.value)}
                />
                <HintTextField
                  label={t("group.ai-provider-settings.model")}
                  hint={t("group.ai-provider-settings.model-description")}
                  value={formData.model}
                  {...form.fieldProps("model")}
                  onChange={event => update("model", event.target.value)}
                />
                <HintTextField
                  label={t("group.ai-provider-settings.api-key")}
                  hint={t(isEdit
                    ? "group.ai-provider-settings.api-key-description-edit"
                    : "group.ai-provider-settings.api-key-description-create")}
                  persistentHint={isEdit}
                  type="password"
                  value={formData.apiKey}
                  {...form.fieldProps("apiKey")}
                  onChange={event => update("apiKey", event.target.value)}
                />
                <HintTextField
                  label={t("group.ai-provider-settings.base-url")}
                  hint={t("group.ai-provider-settings.base-url-description")}
                  value={formData.baseUrl}
                  onChange={event => update("baseUrl", event.target.value)}
                />
                <BaseNumberInput
                  label={t("group.ai-provider-settings.request-timeout-seconds")}
                  value={formData.timeout}
                  onChange={value => update("timeout", value)}
                  min={0}
                  hideDetails
                  density="compact"
                  variant="outlined"
                  fullWidth
                  sx={{ mb: 2 }}
                />
                <Accordion expanded={advancedOpen} onChange={(_event, expanded) => setAdvancedOpen(expanded)} disableGutters>
                  <AccordionSummary expandIcon={<MdiIcon path={icons.chevronDown} />}>
                    <Typography variant="subtitle2">{t("search.advanced")}</Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ px: 0 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      {t("group.ai-provider-settings.request-headers")}
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <BaseKeyValueEditor value={formData.requestHeaders} onChange={value => update("requestHeaders", value)} />
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      {t("group.ai-provider-settings.request-params")}
                    </Typography>
                    <BaseKeyValueEditor value={formData.requestParams} onChange={value => update("requestParams", value)} />
                  </AccordionDetails>
                </Accordion>

                {testResult && (
                  <Alert severity={testResult.success ? "success" : "error"} variant="standard" sx={{ mt: 2 }}>
                    {`${connectionMessage}${imageSupportMessage}`}
                  </Alert>
                )}
              </Box>
            </CardContent>
          )
        : <AppLoader />}
    </BaseDialog>
  );
}
