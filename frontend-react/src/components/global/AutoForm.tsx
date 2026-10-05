// Usage: <AutoForm items={fields} value={model} onChange={setModel} isValid onIsValidChange={setValid} updateMode />
// Renders a form from a list of field definitions (auto-form-types.ts): checkbox, text/password, textarea, number,
// select and colour fields in a 12-column grid, with optional section headings. `v-model` → `value`/`onChange`,
// `v-model:isValid` → `onIsValidChange`. Rules run as the user types (like `validate-on="input"`).
import { Fragment, useEffect, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Checkbox from "@mui/material/Checkbox";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormHelperText from "@mui/material/FormHelperText";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { field, useFormValidation, type FieldSpec } from "@/hooks/utils";
import { fieldTypes, type AutoFormItems, type FormField } from "./auto-form-types";
import { BaseNumberInput } from "./BaseNumberInput";
import { cssColor, cssSize } from "./colors";
import { InputColor } from "./InputColor";

type AutoFormModel = Record<string, unknown> | unknown[];

interface AutoFormProps {
  value: AutoFormModel;
  onChange?: (value: AutoFormModel) => void;
  /** Accepted for parity with `v-model:isValid`; the validity is reported through `onIsValidChange`. */
  isValid?: boolean;
  onIsValidChange?: (valid: boolean) => void;
  updateMode?: boolean;
  items?: AutoFormItems | null;
  width?: number | string;
  color?: string | null;
  /** Accepted for parity (Vuetify `dark`). */
  dark?: boolean;
  disabledFields?: string[] | null;
  readonlyFields?: string[] | null;
}

function readField(model: AutoFormModel, name: string): unknown {
  return (model as Record<string, unknown>)[name];
}

export function AutoForm({
  value,
  onChange,
  onIsValidChange,
  updateMode = false,
  items,
  width = "max",
  color = null,
  disabledFields = null,
  readonlyFields = null,
}: AutoFormProps) {
  const fields: AutoFormItems = items ?? [];

  const activeRules = (inputField: FormField) =>
    !(inputField.disableUpdate && updateMode) ? inputField.rules || [] : [];

  const form = useFormValidation(
    Object.fromEntries(fields.map(inputField => [
      inputField.varName,
      field<unknown>(readField(value, inputField.varName), activeRules(inputField)),
    ])) as Record<string, FieldSpec>,
  );

  const isValid = form.isValid;
  useEffect(() => {
    onIsValidChange?.(isValid);
  }, [isValid, onIsValidChange]);

  function setField(name: string, newValue: unknown) {
    onChange?.(Array.isArray(value) ? Object.assign([...value], { [name]: newValue }) : { ...value, [name]: newValue });
  }

  function stateOf(inputField: FormField) {
    const base = (inputField.disableUpdate && updateMode) || (!updateMode && inputField.disableCreate);
    return {
      readonly: !!base || !!readonlyFields?.includes(inputField.varName),
      disabled: !!base || !!disabledFields?.includes(inputField.varName),
    };
  }

  function renderInput(inputField: FormField): ReactNode {
    const name = inputField.varName;
    const state = stateOf(inputField);
    const current = readField(value, name);
    const validation = form.fieldProps(name);
    const helperText = validation.helperText ?? (inputField.hint || undefined);

    switch (inputField.type) {
      case fieldTypes.BOOLEAN:
        return (
          <>
            <FormControlLabel
              control={(
                <Checkbox
                  name={name}
                  checked={!!current}
                  disabled={state.disabled}
                  readOnly={state.readonly}
                  onChange={(event) => {
                    if (!state.readonly) setField(name, event.target.checked);
                  }}
                />
              )}
              label={inputField.label}
              sx={{ ml: 0 }}
            />
            {inputField.hint ? <FormHelperText>{inputField.hint}</FormHelperText> : null}
          </>
        );
      case fieldTypes.TEXT:
      case fieldTypes.PASSWORD:
      case fieldTypes.TEXT_AREA:
        return (
          <TextField
            fullWidth
            multiline={inputField.type === fieldTypes.TEXT_AREA}
            minRows={inputField.type === fieldTypes.TEXT_AREA ? 3 : undefined}
            type={inputField.type === fieldTypes.PASSWORD ? "password" : "text"}
            variant="filled"
            label={inputField.label}
            name={name}
            value={(current as string | null | undefined) ?? ""}
            disabled={state.disabled}
            error={validation.error}
            helperText={helperText}
            onInput={validation.onInput}
            onChange={event => setField(name, event.target.value)}
            slotProps={{ input: { readOnly: state.readonly } }}
          />
        );
      case fieldTypes.NUMBER:
        return (
          <BaseNumberInput
            fullWidth
            variant="underlined"
            density="comfortable"
            label={inputField.label}
            name={name}
            value={current as number | null | undefined}
            controlVariant={inputField.numberInputConfig?.controlVariant}
            min={inputField.numberInputConfig?.min}
            max={inputField.numberInputConfig?.max}
            precision={inputField.numberInputConfig?.precision}
            hint={inputField.hint}
            hideDetails={!inputField.hint && !validation.error}
            error={validation.error}
            helperText={helperText}
            onInput={validation.onInput}
            onChange={newValue => setField(name, newValue)}
          />
        );
      case fieldTypes.SELECT: {
        const valueKey = inputField.selectReturnValue || "text";
        return (
          <TextField
            select
            fullWidth
            variant="filled"
            label={inputField.label}
            name={name}
            value={(current as string | null | undefined) ?? ""}
            disabled={state.disabled}
            error={validation.error}
            helperText={helperText}
            onInput={validation.onInput}
            onChange={event => setField(name, event.target.value)}
            slotProps={{ input: { readOnly: state.readonly } }}
          >
            {(inputField.options ?? []).map(option => (
              <MenuItem key={option[valueKey] ?? option.text} value={option[valueKey] ?? option.text}>
                {option.text}
              </MenuItem>
            ))}
          </TextField>
        );
      }
      case fieldTypes.COLOR:
        return (
          <Box sx={{ display: "flex", width: "100%" }}>
            <InputColor value={(current as string | undefined) ?? ""} onChange={newValue => setField(name, newValue)} />
          </Box>
        );
      default:
        return null;
    }
  }

  return (
    <form noValidate onSubmit={event => event.preventDefault()}>
      <Card
        elevation={0}
        sx={theme => ({
          my: 1,
          width: width === "max" ? undefined : cssSize(width),
          bgcolor: color ? cssColor(theme, color) : "transparent",
        })}
      >
        <Grid container spacing={0}>
          {fields.map((inputField, index) => (
            <Fragment key={index}>
              {inputField.section
                ? (
                    <Grid size={12} sx={{ px: 1 }}>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="h6" component="div" sx={{ pl: 0, py: 1 }}>
                        {inputField.section}
                      </Typography>
                      {inputField.sectionDetails
                        ? <Typography variant="body2" sx={{ pl: 0, mt: 0, pt: 0 }}>{inputField.sectionDetails}</Typography>
                        : null}
                    </Grid>
                  )
                : null}
              <Grid size={inputField.cols || 12} sx={{ px: 1 }}>
                {renderInput(inputField)}
              </Grid>
            </Fragment>
          ))}
        </Grid>
      </Card>
    </form>
  );
}
