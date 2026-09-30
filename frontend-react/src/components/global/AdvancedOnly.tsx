import type { ReactNode } from "react";
import { useMealieAuth } from "~/hooks/use-mealie-auth";

/** Renders its children only for logged-in users with advanced options toggled. */
export function AdvancedOnly({ children }: { children: ReactNode }) {
  const { user } = useMealieAuth();
  return user?.advanced ? <>{children}</> : null;
}

export default AdvancedOnly;
