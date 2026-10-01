import { useEffect, useRef, useState } from "react";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import { AppLoader } from "~/components/global/AppLoader";
import { BaseDialog } from "~/components/global/BaseDialog";
import { BaseKeyValueEditor } from "~/components/global/BaseKeyValueEditor";
import { Icon } from "~/components/global/Icon";
import { NumberInput, TextInput, VForm } from "~/components/global/form";
import { useAIProviders } from "~/hooks/use-ai-providers";
import { useI18n } from "~/hooks/use-global-i18n";
import { validators } from "~/hooks/use-validators";
import { icons } from "~/lib/icons";
import type { AIProviderCreate, AIProviderTestResult, AIProviderUpdate } from "~/lib/api/types/group";

export interface GroupAIProviderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providerId?: string;
  onCreate?: (data: AIProviderCreate) => void;
  onUpdate?: (id: string, data: AIProviderUpdate) => void;
}

const defaultForm = () => ({
  name: "",
  model: "",
  apiKey: "",
  baseUrl: "",
  timeout: 300,
  requestHeaders: {} as Record<string, string>,
  requestParams: {} as Record<string, string>,
});

type FormData = ReturnType<typeof defaultForm>;

export function GroupAIProviderDialog({ open, onOpenChange, providerId, onCreate, onUpdate }: GroupAIProviderDialogProps) {
  const i18n = useI18n();
  const { loading, getOne, testOne, testSavedOne } = useAIProviders();
  const [init, setInit] = useState(false);
  const [advancedPanel, setAdvancedPanel] = useState(false);
  const [formData, setFormData] = useState<FormData>(defaultForm);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<AIProviderTestResult | null>(null);
  const update = (patch: Partial<FormData>) => setFormData(prev => ({ ...prev, ...patch }));

  const isEdit = !!providerId;
  const submitDisabled = !formData.name?.trim() || !formData.model?.trim() || (!isEdit && !formData.apiKey?.trim());

  let connectionMessage = "";
  let imageSupportMessage = "";
  if (testResult) {
    connectionMessage = testResult.success
      ? i18n.t("group.ai-provider-settings.test-connection-succeeded")
      : testResult.message || i18n.t("group.ai-provider-settings.test-connection-failed");
    // Capability info rather than a second pass/fail check - a text-only provider is a valid setup,
    // it just can't be used as the image provider. Appended to the connection message above.
    if (testResult.success) {
      imageSupportMessage = testResult.supportsImages
        ? ` — ${i18n.t("group.ai-provider-settings.supports-images")}`
        : ` — ${i18n.t("group.ai-provider-settings.text-only-provider")}`;
    }
  }

  function resetForm() {
    setFormData(defaultForm());
    setAdvancedPanel(false);
    setTestResult(null);
  }

  // Fetch existing provider when editing; reset form for create mode
  const requestToken = useRef(0);
  useEffect(() => {
    // Bump the token even when bailing out below, so a fetch still in flight from a
    // previous provider/dialog state can never apply its (now stale) result afterward.
    const token = ++requestToken.current;
    if (!open) return;
    setTestResult(null);
    if (!providerId) {
      // Create mode — just show the empty form
      resetForm();
      setInit(true);
      return;
    }
    setInit(false);
    void getOne(providerId).then(({ data }) => {
      if (token !== requestToken.current) return;
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
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run on open/provider change only
  }, [open, providerId]);

  function common() {
    return {
      name: formData.name,
      model: formData.model,
      baseUrl: formData.baseUrl || null,
      timeout: formData.timeout,
      requestHeaders: Object.keys(formData.requestHeaders).length ? formData.requestHeaders : undefined,
      requestParams: Object.keys(formData.requestParams).length ? formData.requestParams : undefined,
    };
  }

  function handleSubmit() {
    // Required field guard (button is also disabled, but keep as a safeguard)
    if (!formData.name?.trim() || !formData.model?.trim()) return;
    if (!isEdit && !formData.apiKey?.trim()) return;

    if (isEdit && providerId) {
      const payload: AIProviderUpdate & { apiKey?: string } = common();
      if (formData.apiKey) {
        payload.apiKey = formData.apiKey;
      }
      onUpdate?.(providerId, payload);
    }
    else {
      onCreate?.({ ...common(), apiKey: formData.apiKey } as AIProviderCreate);
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
        const overrides: AIProviderUpdate & { apiKey?: string } = common();
        if (formData.apiKey) {
          overrides.apiKey = formData.apiKey;
        }
        ({ data } = await testSavedOne(providerId, overrides));
      }
      else {
        ({ data } = await testOne({ ...common(), apiKey: formData.apiKey } as AIProviderCreate));
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
      title={isEdit ? i18n.t("group.ai-provider-settings.edit-provider") : i18n.t("group.ai-provider-settings.create-provider")}
      icon={icons.robot}
      loading={loading}
      canSubmit
      submitIcon={isEdit ? icons.save : icons.createAlt}
      submitText={isEdit ? i18n.t("general.update") : i18n.t("general.create")}
      submitDisabled={submitDisabled}
      onSubmit={handleSubmit}
      onClose={resetForm}
      customCardAction={(
        <Button
          variant="text"
          disabled={submitDisabled || testing}
          startIcon={testing ? <CircularProgress size={16} color="inherit" /> : undefined}
          onClick={() => void handleTest()}
        >
          {i18n.t("group.ai-provider-settings.test-connection")}
        </Button>
      )}
    >
      {init
        ? (
            <Box sx={{ p: 2, maxHeight: "70vh", overflowY: "auto" }}>
              <VForm>
                <TextInput
                  value={formData.name}
                  onChange={name => update({ name })}
                  label={i18n.t("group.ai-provider-settings.provider-name")}
                  rules={[validators.required]}
                  density="compact"
                  variant="outlined"
                  sx={{ mb: 2 }}
                  autoComplete="off"
                />
                <TextInput
                  value={formData.model}
                  onChange={model => update({ model })}
                  label={i18n.t("group.ai-provider-settings.model")}
                  hint={i18n.t("group.ai-provider-settings.model-description")}
                  rules={[validators.required]}
                  density="compact"
                  variant="outlined"
                  sx={{ mb: 2 }}
                  autoComplete="off"
                />
                <TextInput
                  value={formData.apiKey}
                  onChange={apiKey => update({ apiKey })}
                  label={i18n.t("group.ai-provider-settings.api-key")}
                  hint={i18n.t(isEdit ? "group.ai-provider-settings.api-key-description-edit" : "group.ai-provider-settings.api-key-description-create")}
                  persistentHint={isEdit}
                  rules={isEdit ? [] : [validators.required]}
                  density="compact"
                  variant="outlined"
                  type="password"
                  sx={{ mb: 2 }}
                  autoComplete="new-password"
                />
                <TextInput
                  value={formData.baseUrl}
                  onChange={baseUrl => update({ baseUrl })}
                  label={i18n.t("group.ai-provider-settings.base-url")}
                  hint={i18n.t("group.ai-provider-settings.base-url-description")}
                  density="compact"
                  variant="outlined"
                  sx={{ mb: 2 }}
                  autoComplete="off"
                />
                <NumberInput
                  value={formData.timeout}
                  onChange={timeout => update({ timeout: timeout ?? 0 })}
                  label={i18n.t("group.ai-provider-settings.request-timeout-seconds")}
                  min={0}
                  hideDetails
                  density="compact"
                  variant="outlined"
                  sx={{ mb: 2 }}
                />
                <Accordion expanded={advancedPanel} onChange={(_, v) => setAdvancedPanel(v)} disableGutters>
                  <AccordionSummary expandIcon={<Icon path={icons.chevronDown} />}>
                    <Typography variant="subtitle2">{i18n.t("search.advanced")}</Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ px: 0 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>{i18n.t("group.ai-provider-settings.request-headers")}</Typography>
                    <Box sx={{ mb: 2 }}>
                      <BaseKeyValueEditor value={formData.requestHeaders} onChange={requestHeaders => update({ requestHeaders })} />
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>{i18n.t("group.ai-provider-settings.request-params")}</Typography>
                    <BaseKeyValueEditor value={formData.requestParams} onChange={requestParams => update({ requestParams })} />
                  </AccordionDetails>
                </Accordion>

                {testResult && (
                  <Alert severity={testResult.success ? "success" : "error"} variant="standard" sx={{ mt: 2 }}>
                    {connectionMessage}
                    {imageSupportMessage}
                  </Alert>
                )}
              </VForm>
            </Box>
          )
        : <AppLoader />}
    </BaseDialog>
  );
}

export default GroupAIProviderDialog;
