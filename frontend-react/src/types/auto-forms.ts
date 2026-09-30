type FormFieldType
  = | "text"
    | "textarea"
    | "number"
    | "list"
    | "select"
    | "object"
    | "boolean"
    | "color"
    | "password";

// Rules are applied to whatever value type the field holds.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- rule inputs vary by field type
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
