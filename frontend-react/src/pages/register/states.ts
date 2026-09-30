import { useMemo, useState } from "react";

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

export function useRegistration(): RegistrationContext {
  const [ctx, setCtx] = useState<Context & { history: { state: States }[] }>({
    state: States.Initial,
    type: RegistrationType.Unknown,
    history: [{ state: States.Initial }],
  });

  const actions = useMemo(() => ({
    back: () => setCtx((c) => {
      const history = [...c.history];
      const last = history.pop();
      return last ? { ...c, state: last.state, history } : c;
    }),
    setState: (state: States) => setCtx(c => ({ ...c, history: [...c.history, { state: c.state }], state })),
    setType: (type: RegistrationType) => setCtx(c => ({ ...c, type })),
  }), []);

  return { ctx, ...actions };
}
