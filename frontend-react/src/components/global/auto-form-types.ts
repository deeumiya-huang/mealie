// Types and field-type constants used by AutoForm. They live in types/auto-forms.ts and
// hooks/forms/use-field-types.ts (ports of the Vue files); this module re-exports them for AutoForm.
export { fieldTypes } from "@/hooks/forms/use-field-types";
export type {
  AutoFormItems,
  FormField,
  FormFieldNumberInputConfig,
  FormFieldType,
  FormSelectOption,
  FormValidationRule,
} from "@/types/auto-forms";
