import { useCallback, useState } from "react";
import type { RequestResponse } from "@/lib/api/types/non-generated";
import type { ValidationResponse } from "@/lib/api/types/response";
import { required, email, whitespace, url, urlOptional, minLength, maxLength } from "@/lib/validators";

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
 * useAsyncValidator returns an async function that, when called, validates the value against the
 * backend and sets the error messages when applicable. (Vue passed the error-messages ref in; here
 * the hook owns them and returns them.)
 */
export const useAsyncValidator = (
  value: string,
  validatorFunc: (v: string) => Promise<RequestResponse<ValidationResponse>>,
  validatorMessage: string,
) => {
  const [valid, setValid] = useState(false);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);

  const validate = useCallback(async () => {
    setErrorMessages([]);
    const { data } = await validatorFunc(value);

    if (!data?.valid) {
      setValid(false);
      setErrorMessages([validatorMessage]);
      return false;
    }

    setValid(true);
    return true;
  }, [value, validatorFunc, validatorMessage]);

  return { validate, valid, errorMessages };
};
