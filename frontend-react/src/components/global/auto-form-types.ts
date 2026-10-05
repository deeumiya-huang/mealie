// Types and field-type constants used by AutoForm (ports of `types/auto-forms.ts` and
// `composables/forms/use-field-types.ts`).

export const fieldTypes = {
  TEXT: "text",
  TEXT_AREA: "textarea",
  NUMBER: "number",
  SELECT: "select",
  BOOLEAN: "boolean",
  PASSWORD: "password",
  COLOR: "color",
} as const;

export type FormFieldType
  = | "text"
    | "textarea"
    | "number"
    | "list"
    | "select"
    | "object"
    | "boolean"
    | "color"
    | "password";

// any: validation rules receive whatever value type the field holds (string, number, boolean…).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FormValidationRule = (value: any) => boolean | string;

export interface FormSelectOption {
  text: string;
  value?: string;
}

export interface FormFieldNumberInputConfig {
  min?: number;
  max?: number;
  precision?: number;
  controlVariant?: "split" | "default" | "hidden" | "stacked";
}

export interface FormField {
  section?: string;
  sectionDetails?: string;
  cols?: number | "auto";
  label?: string;
  hint?: string;
  varName: string;
  type: FormFieldType;
  rules?: FormValidationRule[];
  disableUpdate?: boolean;
  disableCreate?: boolean;
  numberInputConfig?: FormFieldNumberInputConfig;
  options?: FormSelectOption[];
  selectReturnValue?: "text" | "value";
}

export type AutoFormItems = FormField[];
