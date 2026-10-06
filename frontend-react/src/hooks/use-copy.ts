import { useI18n } from "@/i18n";
import { useClipboard } from "@/hooks/utils";
import { alert } from "./use-toast";

// `copy` (hooks/utils/use-clipboard) falls back to execCommand and never rejects, so once it
// resolves the text was handed to the clipboard; VueUse additionally exposed `copied` to check it.

export function useCopy() {
  const { copy, copied, isSupported } = useClipboard();
  const i18n = useI18n();

  function copyText(text: string) {
    if (!isSupported) {
      alert.error(i18n.t("general.clipboard-not-supported"));
      return;
    }
    copy(text).then(() => {
      alert.success(i18n.t("general.copied-to-clipboard"));
    }).catch(() => {
      alert.error(i18n.t("general.clipboard-copy-failure"));
    });
  }

  return { copyText, copied };
}

export function useCopyList() {
  const { copy, isSupported } = useClipboard();
  const i18n = useI18n();

  function checkClipboard() {
    if (!isSupported) {
      alert.error(i18n.t("general.your-browser-does-not-support-clipboard"));
      return false;
    }

    return true;
  }

  function copyPlain(list: string[]) {
    if (!checkClipboard()) return;

    const text = list.join("\n");
    copyText(text, list.length);
  }

  function copyMarkdown(list: string[]) {
    if (!checkClipboard()) return;

    const text = list.map(item => `- ${item}`).join("\n");
    copyText(text, list.length);
  }

  function copyMarkdownCheckList(list: string[]) {
    if (!checkClipboard()) return;

    const text = list.map(item => `- [ ] ${item}`).join("\n");
    copyText(text, list.length);
  }

  function copyText(text: string, len: number) {
    copy(text).then(() => {
      alert.success(i18n.t("general.copied-items-to-clipboard", len));
    }).catch(() => {
      alert.error(i18n.t("general.clipboard-copy-failure"));
    });
  }

  return {
    copyPlain,
    copyMarkdown,
    copyMarkdownCheckList,
  };
}
