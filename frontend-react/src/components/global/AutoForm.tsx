import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { fieldTypes } from "~/hooks/forms";
import type { AutoFormItems, FormField } from "~/types/auto-forms";
import { CheckboxInput, NumberInput, SelectInput, TextInput, VForm } from "./form";
import { InputColor } from "./InputColor";

type Model = Record<string, unknown>;

export interface AutoFormProps<M extends object> {
  value: M;
  onChange: (value: M) => void;
  onValidChange?: (valid: boolean) => void;
  updateMode?: boolean;
  items: AutoFormItems;
  width?: number | string;
  color?: string | null;
  disabledFields?: string[] | null;
  readonlyFields?: string[] | null;
}

/** Renders a form from a field schema (text, textarea, number, select, boolean, password, color). */
export function AutoForm<M extends object>({
  value, onChange, onValidChange, updateMode = false, items, width = "max", disabledFields = null, readonlyFields = null,
}: AutoFormProps<M>) {
  const model = value as unknown as Model;
  const set = (key: string, v: unknown) => onChange({ ...(value as object), [key]: v } as M);

  const stateOf = (field: FormField) => {
    const base = (!!field.disableUpdate && updateMode) || (!updateMode && !!field.disableCreate);
    return {
      readOnly: base || !!readonlyFields?.includes(field.varName),
      disabled: base || !!disabledFields?.includes(field.varName),
    };
  };
  const rulesOf = (field: FormField) => (!(field.disableUpdate && updateMode) ? field.rules || [] : []);

  return (
    <VForm onValidChange={onValidChange}>
      <Card elevation={0} sx={{ my: 1, width: width === "max" ? "100%" : width, bgcolor: "transparent" }}>
        <Grid container>
          {items.map((field, index) => {
            const state = stateOf(field);
            const cols = field.cols === "auto" ? "auto" : field.cols || 12;
            return (
              <Box key={index} sx={{ display: "contents" }}>
                {field.section && (
                  <Grid size={12} sx={{ px: 1 }}>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="h6" sx={{ py: 1 }}>{field.section}</Typography>
                    {field.sectionDetails && <Typography variant="body2" sx={{ pb: 1 }}>{field.sectionDetails}</Typography>}
                  </Grid>
                )}
                <Grid size={cols} sx={{ px: 1 }}>
                  {field.type === fieldTypes.BOOLEAN && (
                    <CheckboxInput
                      name={field.varName}
                      checked={!!model[field.varName]}
                      onChange={v => set(field.varName, v)}
                      readOnly={state.readOnly}
                      disabled={state.disabled}
                      hint={field.hint}
                      hideDetails={!field.hint}
                      persistentHint={!!field.hint}
                      label={<span style={{ marginInlineStart: 16 }}>{field.label}</span>}
                    />
                  )}
                  {(field.type === fieldTypes.TEXT || field.type === fieldTypes.PASSWORD) && (
                    <TextInput
                      value={(model[field.varName] as string | null | undefined) ?? ""}
                      onChange={v => set(field.varName, v)}
                      readOnly={state.readOnly}
                      disabled={state.disabled}
                      type={field.type === fieldTypes.PASSWORD ? "password" : "text"}
                      variant="solo-filled"
                      label={field.label}
                      name={field.varName}
                      hint={field.hint || ""}
                      rules={rulesOf(field)}
                    />
                  )}
                  {field.type === fieldTypes.TEXT_AREA && (
                    <TextInput
                      value={(model[field.varName] as string | null | undefined) ?? ""}
                      onChange={v => set(field.varName, v)}
                      readOnly={state.readOnly}
                      disabled={state.disabled}
                      variant="solo-filled"
                      multiline
                      rows={3}
                      autoGrow
                      label={field.label}
                      name={field.varName}
                      hint={field.hint || ""}
                      rules={rulesOf(field)}
                    />
                  )}
                  {field.type === fieldTypes.NUMBER && (
                    <NumberInput
                      value={model[field.varName] as number | null}
                      onChange={v => set(field.varName, v)}
                      variant="underlined"
                      label={field.label}
                      name={field.varName}
                      min={field.numberInputConfig?.min}
                      max={field.numberInputConfig?.max}
                      step={field.numberInputConfig?.precision === 0 ? 1 : undefined}
                      hint={field.hint}
                      hideDetails={!field.hint}
                      persistentHint={!!field.hint}
                      rules={rulesOf(field)}
                    />
                  )}
                  {field.type === fieldTypes.SELECT && (
                    <SelectInput
                      value={model[field.varName]}
                      onChange={v => set(field.varName, v)}
                      readOnly={state.readOnly}
                      disabled={state.disabled}
                      variant="solo-filled"
                      label={field.label}
                      name={field.varName}
                      items={field.options ?? []}
                      itemTitle="text"
                      itemValue={field.selectReturnValue || "text"}
                      hint={field.hint}
                      persistentHint
                      rules={rulesOf(field)}
                    />
                  )}
                  {field.type === fieldTypes.COLOR && (
                    <Box sx={{ display: "flex", width: "100%" }}>
                      <InputColor value={(model[field.varName] as string) ?? ""} onChange={v => set(field.varName, v)} />
                    </Box>
                  )}
                </Grid>
              </Box>
            );
          })}
        </Grid>
      </Card>
    </VForm>
  );
}

export default AutoForm;
