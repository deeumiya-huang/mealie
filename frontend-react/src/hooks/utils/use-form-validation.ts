import { useState } from "react";

/**
 * Replacement for `<v-form ref>` + `:rules` (Vuetify validate-on "input").
 *
 *   const { required, email } = validators;                       // lib/validators
 *   const form = useFormValidation({
 *     username: field(username, [required]),
 *     email: field(email, [required, email]),
 *   });
 *   <TextField label={t("user.email")} value={email} onChange={…} {...form.fieldProps("email")} />
 *   <BaseButton disabled={!form.isValid} onClick={() => form.validate() && save()} />
 *
 * Rules return `true` or an error message (same as Vuetify). A field shows its first error after the
 * user typed in it or after `validate()`; `isValid` is always computed from the current values.
 * `resetValidation()` hides the messages again (Vue `form.resetValidation()`); values belong to the caller.
 * `validate()` returns `isValid` of the current render: a handler that changes a value and validates in the
 * same tick sees the previous values (`v-form.validate()` would see the new ones) — validate in a later
 * handler or effect instead.
 */
export type ValidationRule<V> = (value: V) => boolean | string;

export interface FieldSpec {
  value: unknown;
  rules: ValidationRule<never>[];
}

/** Pairs a value with its rules (keeps the rule parameter type checked against the value). */
export function field<V>(value: V, rules: ValidationRule<V>[]): FieldSpec {
  return { value, rules: rules as ValidationRule<never>[] };
}

export interface FieldValidationProps {
  error: boolean;
  helperText?: string;
  onInput: () => void;
}

function firstError(spec: FieldSpec): string | null {
  for (const rule of spec.rules) {
    const result = (rule as ValidationRule<unknown>)(spec.value);
    if (result !== true) {
      return typeof result === "string" ? result : "";
    }
  }
  return null;
}

export function useFormValidation<K extends string>(fields: Record<K, FieldSpec>) {
  const [touched, setTouched] = useState<ReadonlySet<string>>(() => new Set());
  const [validated, setValidated] = useState(false);

  const names = Object.keys(fields) as K[];
  const errors = Object.fromEntries(names.map(name => [name, firstError(fields[name])])) as Record<K, string | null>;
  const isValid = names.every(name => errors[name] === null);

  function touch(name: K) {
    setTouched(current => (current.has(name) ? current : new Set(current).add(name)));
  }

  /** Shows every field's messages; returns whether the form is valid (Vue `(await form.validate()).valid`). */
  function validate(): boolean {
    setValidated(true);
    return isValid;
  }

  function resetValidation() {
    setValidated(false);
    setTouched(new Set());
  }

  function errorFor(name: K): string | null {
    return validated || touched.has(name) ? errors[name] : null;
  }

  /** Props for an MUI TextField: `error`, `helperText` (only while there is an error) and `onInput`. */
  function fieldProps(name: K): FieldValidationProps {
    const message = errorFor(name);
    const onInput = () => touch(name);
    return message === null ? { error: false, onInput } : { error: true, helperText: message, onInput };
  }

  return { isValid, errors, errorFor, fieldProps, validate, resetValidation, touch };
}
