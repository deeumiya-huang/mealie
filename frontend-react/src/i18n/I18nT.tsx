import { Fragment, type ReactNode } from "react";
import { useI18n } from "./index";

// Usage (port of vue-i18n's <i18n-t> component interpolation):
//   <I18nT keypath="group.manage-members-description" slots={{ manage: <b>{t("group.manage")}</b> }} />
// Each `{name}` placeholder of the message is replaced by `slots[name]`; the rest is plain text.
// Renders a fragment, like <i18n-t> without a `tag`.

interface I18nTProps {
  keypath: string;
  slots?: Record<string, ReactNode>;
  plural?: number;
}

const MARKER = "\u0000";

export function I18nT({ keypath, slots = {}, plural }: I18nTProps) {
  const { t } = useI18n();
  const names = Object.keys(slots);
  const markers = Object.fromEntries(names.map((name, index) => [name, `${MARKER}${index}${MARKER}`]));
  const message = plural === undefined ? t(keypath, markers) : t(keypath, markers, plural);

  const parts = message.split(MARKER);
  return (
    <>
      {parts.map((part, index) => {
        // odd parts are marker indexes, even parts are text
        const node = index % 2 === 1 ? slots[names[Number(part)]] : part;
        return <Fragment key={index}>{node}</Fragment>;
      })}
    </>
  );
}
