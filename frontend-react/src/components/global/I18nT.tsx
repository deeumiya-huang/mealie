import { Fragment } from "react";
import type { ReactNode } from "react";
import { useI18n } from "~/hooks/use-global-i18n";

/**
 * `<i18n-t keypath="...">` equivalent: renders a message whose `{name}` placeholders are filled with
 * React nodes (the Vue named slots).
 */
export function I18nT({ keypath, slots, params = {} }: { keypath: string; slots: Record<string, ReactNode>; params?: Record<string, unknown> }) {
  const i18n = useI18n();
  // Format with sentinel placeholders so plurals/params still resolve, then split on them.
  const sentinels = Object.fromEntries(Object.keys(slots).map(name => [name, `\u0000${name}\u0000`]));
  const message = i18n.t(keypath, { ...params, ...sentinels });
  const parts = message.split("\u0000");
  return (
    <>
      {parts.map((part, i) => (i % 2 === 1 ? <Fragment key={i}>{slots[part]}</Fragment> : <Fragment key={i}>{part}</Fragment>))}
    </>
  );
}

export default I18nT;
