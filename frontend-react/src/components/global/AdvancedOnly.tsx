// Usage: <AdvancedOnly>…</AdvancedOnly> — renders its children only if the user is logged in and has the
// advanced options toggled.
import type { ReactNode } from "react";
import { useMealieAuth } from "@/hooks/use-mealie-auth";

export function AdvancedOnly({ children }: { children?: ReactNode }) {
  const auth = useMealieAuth();
  const advanced = auth.user?.advanced || false;

  return advanced ? <>{children}</> : null;
}
