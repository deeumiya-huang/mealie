// Port of types/auto-forms.ts: the field definitions AutoForm renders.

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

/**
 * The handle a form exposes to the code that submits it (Vue: Vuetify's `VForm` instance, used as a
 * template ref): validate before saving, reset after.
 */
export interface VForm {
  validate: () => boolean | Promise<boolean>;
  reset: () => void;
  resetValidation: () => void;
}
