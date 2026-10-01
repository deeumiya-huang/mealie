import { useState } from "react";
import { copyToClipboard, isClipboardSupported } from "~/lib/clipboard";
import { getGlobalI18n, useI18n } from "~/hooks/use-global-i18n";
import type { I18nComposer } from "~/hooks/use-global-i18n";
import { alert } from "./use-toast";

export function useCopy() {
  const i18n = useI18n();
  const [copied, setCopied] = useState(false);

  function copyText(text: string) {
    if (!isClipboardSupported()) {
      alert.error(i18n.t("general.clipboard-not-supported"));
      return;
    }
    void copyToClipboard(text).then((ok) => {
      setCopied(ok);
      // Verify copy success as no error is thrown on failure.
      if (ok) {
        alert.success(i18n.t("general.copied-to-clipboard"));
      }
      else {
        alert.error(i18n.t("general.clipboard-copy-failure"));
      }
    });
  }

  return { copyText, copied };
}

/** Copy helpers usable outside components (controllers); `useCopyList` is the hook form. */
export function createCopyList(i18n: I18nComposer = getGlobalI18n()) {
  function checkClipboard() {
    if (!isClipboardSupported()) {
      alert.error(i18n.t("general.your-browser-does-not-support-clipboard"));
      return false;
    }

    return true;
  }

  function copyText(text: string, len: number) {
    void copyToClipboard(text).then((ok) => {
      if (ok) {
        alert.success(i18n.t("general.copied-items-to-clipboard", len));
      }
      else {
        alert.error(i18n.t("general.clipboard-copy-failure"));
      }
    });
  }

  function copyPlain(list: string[]) {
    if (!checkClipboard()) return;
    copyText(list.join("\n"), list.length);
  }

  function copyMarkdown(list: string[]) {
    if (!checkClipboard()) return;
    copyText(list.map(item => `- ${item}`).join("\n"), list.length);
  }

  function copyMarkdownCheckList(list: string[]) {
    if (!checkClipboard()) return;
    copyText(list.map(item => `- [ ] ${item}`).join("\n"), list.length);
  }

  return {
    copyPlain,
    copyMarkdown,
    copyMarkdownCheckList,
  };
}

export function useCopyList() {
  return createCopyList(useI18n());
}
