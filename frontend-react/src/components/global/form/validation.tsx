import { createContext, forwardRef, useCallback, useContext, useEffect, useId, useImperativeHandle, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import Box from "@mui/material/Box";
import type { SxProps, Theme } from "@mui/material/styles";

/** Vuetify-style validation rule: returns `true` when valid, or an error message. */
// The rules are written for a specific value type at each call site; `never` lets any typed rule in.
export type Rule<T = never> = (value: T) => boolean | string;

export function runRules<T>(value: T, rules: readonly Rule<T>[] | undefined): string | null {
  for (const rule of rules ?? []) {
    const result = rule(value);
    if (result !== true) {
      return typeof result === "string" ? result : "";
    }
  }
  return null;
}

interface FieldHandle {
  isValid: () => boolean;
  touch: () => void;
  reset: () => void;
}

interface FormContextValue {
  register: (id: string, handle: FieldHandle) => () => void;
  update: () => void;
  forced: boolean;
  disabled: boolean;
}

const FormContext = createContext<FormContextValue | null>(null);

export interface FormHandle {
  /** Shows every field's error and returns whether the form is valid (`v-form.validate()`). */
  validate: () => boolean;
  /** Hides errors again (`resetValidation()`). */
  resetValidation: () => void;
  isValid: () => boolean;
}

export interface VFormProps {
  children?: ReactNode;
  onSubmit?: (e: FormEvent<HTMLFormElement>) => void;
  /** `v-model` on v-form: live validity of all registered fields. */
  onValidChange?: (valid: boolean) => void;
  disabled?: boolean;
  sx?: SxProps<Theme>;
  className?: string;
  id?: string;
}

/**
 * `<v-form>` equivalent. Fields using `useFieldRules()` register here; `ref.validate()` forces all
 * errors to show. Submitting prevents the native navigation.
 */
export const VForm = forwardRef<FormHandle, VFormProps>(function VForm({ children, onSubmit, onValidChange, disabled = false, sx, className, id }, ref) {
  const fields = useRef(new Map<string, FieldHandle>());
  const [forced, setForced] = useState(false);
  const [validity, setValidity] = useState(true);
  const onValidChangeRef = useRef(onValidChange);
  onValidChangeRef.current = onValidChange;

  const recompute = useCallback(() => {
    setValidity([...fields.current.values()].every(f => f.isValid()));
  }, []);

  useEffect(() => {
    onValidChangeRef.current?.(validity);
  }, [validity]);

  const ctx = useMemo<FormContextValue>(() => ({
    register(fieldId, handle) {
      fields.current.set(fieldId, handle);
      recompute();
      return () => {
        fields.current.delete(fieldId);
        recompute();
      };
    },
    update() {
      recompute();
    },
    forced,
    disabled,
  }), [forced, disabled, recompute]);

  useImperativeHandle(ref, () => ({
    validate() {
      setForced(true);
      fields.current.forEach(f => f.touch());
      return [...fields.current.values()].every(f => f.isValid());
    },
    resetValidation() {
      setForced(false);
      fields.current.forEach(f => f.reset());
    },
    isValid: () => [...fields.current.values()].every(f => f.isValid()),
  }), []);

  return (
    <FormContext.Provider value={ctx}>
      <Box
        component="form"
        id={id}
        className={className}
        sx={sx}
        noValidate
        onSubmit={(e: FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          onSubmit?.(e);
        }}
      >
        {children}
      </Box>
    </FormContext.Provider>
  );
});

/**
 * Validates `value` against `rules`, reports validity to the enclosing `<VForm>`, and tells the field
 * whether to show the message. Like Vuetify's default (`validate-on="input"`), errors appear once the
 * value has changed or the form was validated.
 */
export function useFieldRules<T>(value: T, rules: readonly Rule<T>[] | undefined, options?: { eager?: boolean }) {
  const ctx = useContext(FormContext);
  const id = useId();
  const [touched, setTouched] = useState(!!options?.eager);
  const initial = useRef(value);
  const message = runRules(value, rules);
  const valid = message === null;

  useEffect(() => {
    if (!Object.is(initial.current, value)) {
      setTouched(true);
    }
  }, [value]);

  const validRef = useRef(valid);
  validRef.current = valid;

  useEffect(() => {
    if (!ctx) return;
    return ctx.register(id, {
      isValid: () => validRef.current,
      touch: () => setTouched(true),
      reset: () => {
        initial.current = value;
        setTouched(false);
      },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- register once per field
  }, [ctx?.register, id]);

  useEffect(() => {
    ctx?.update();
  }, [ctx, valid]);

  const show = !valid && (touched || !!ctx?.forced);
  return {
    error: show,
    helperText: show ? message || undefined : undefined,
    touch: () => setTouched(true),
    formDisabled: ctx?.disabled ?? false,
  };
}
