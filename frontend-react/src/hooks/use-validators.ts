import { useCallback, useRef, useState } from "react";
import type { RequestResponse } from "~/lib/api/types/non-generated";
import type { ValidationResponse } from "~/lib/api/types/response";
import { required, email, whitespace, url, urlOptional, minLength, maxLength } from "~/lib/validators";

export const validators = {
  required,
  email,
  whitespace,
  url,
  urlOptional,
  minLength,
  maxLength,
};

/**
 * Validates a value against the backend and exposes the resulting error messages.
 * (The Vue version wrote into a caller-provided errorMessages ref; here the hook owns them.)
 */
export const useAsyncValidator = (
  value: string,
  validatorFunc: (v: string) => Promise<RequestResponse<ValidationResponse>>,
  validatorMessage: string,
) => {
  const [valid, setValid] = useState(false);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const latest = useRef({ value, validatorFunc, validatorMessage });
  latest.current = { value, validatorFunc, validatorMessage };

  const validate = useCallback(async () => {
    setErrorMessages([]);
    const { data } = await latest.current.validatorFunc(latest.current.value);
    if (!data?.valid) {
      setValid(false);
      setErrorMessages([latest.current.validatorMessage]);
      return false;
    }
    setValid(true);
    return true;
  }, []);

  return { validate, valid, errorMessages };
};
