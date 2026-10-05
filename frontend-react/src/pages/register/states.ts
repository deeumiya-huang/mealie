import { useCallback, useState } from "react";

export enum States {
  Initial,
  ProvideToken,
  ProvideGroupDetails,
  ProvideCredentials,
  ProvideAccountDetails,
  SelectGroupOptions,
  Confirmation,
}

export enum RegistrationType {
  Unknown,
  JoinGroup,
  CreateGroup,
  InitialGroup,
}

interface Context {
  state: States;
  type: RegistrationType;
}

interface RegistrationContext {
  ctx: Context;
  setState(state: States): void;
  setType(type: RegistrationType): void;
  back(): void;
}

interface RegistrationState extends Context {
  history: { state: States }[];
}

/**
 * `start` = the state the page moves to on mount (Vue: `setState` + `setType` in `onMounted`), applied
 * to the initial state so the history is the same as after that first `setState`.
 */
export function useRegistration(start?: Context): RegistrationContext {
  const [context, setContext] = useState<RegistrationState>(() => {
    const initial: RegistrationState = {
      state: States.Initial,
      type: RegistrationType.Unknown,
      history: [
        {
          state: States.Initial,
        },
      ],
    };
    return start ? { ...start, history: [...initial.history, { state: initial.state }] } : initial;
  });

  const back = useCallback(() => {
    setContext((current) => {
      const last = current.history.at(-1);
      if (!last) {
        return current;
      }
      return { ...current, state: last.state, history: current.history.slice(0, -1) };
    });
  }, []);

  const setState = useCallback((state: States) => {
    // saveHistory + set
    setContext(current => ({ ...current, history: [...current.history, { state: current.state }], state }));
  }, []);

  const setType = useCallback((t: RegistrationType) => {
    setContext(current => ({ ...current, type: t }));
  }, []);

  return { ctx: { state: context.state, type: context.type }, setType, setState, back };
}
