import { useState } from "react";
import type { ReactNode } from "react";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { useTheme } from "@mui/material/styles";
import { icons } from "~/lib/icons";
import { copyToClipboard, isClipboardSupported } from "~/lib/clipboard";
import { useI18n } from "~/hooks/use-global-i18n";
import { cssColor } from "~/theme/theme";
import { Icon } from "./Icon";

export interface AppButtonCopyProps {
  copyText: string;
  color?: string;
  icon?: boolean;
  btnClass?: string;
  children?: ReactNode;
}

export function AppButtonCopy({ copyText, color = "", icon = true, btnClass = "", children }: AppButtonCopyProps) {
  const i18n = useI18n();
  const theme = useTheme();
  const [show, setShow] = useState(false);
  const [copiedSuccess, setCopiedSuccess] = useState<boolean | null>(null);
  const supported = isClipboardSupported();

  async function textToClipboard() {
    if (supported) {
      const ok = await copyToClipboard(copyText);
      setCopiedSuccess(ok);
      if (ok) console.info(`Copied\n${copyText}`);
      else console.error("Copy failed");
    }
    else {
      console.warn("Clipboard is currently not supported by your browser. Ensure you're on a secure (https) site.");
    }
    setShow(true);
    setTimeout(() => setShow(false), 3000);
  }

  const message = !supported || copiedSuccess !== null
    ? (
        <span>
          <Icon path={icons.clipboardCheck} start size="small" />
          {children ?? (!supported
            ? i18n.t("general.your-browser-does-not-support-clipboard")
            : copiedSuccess ? i18n.t("general.copied_message") : i18n.t("general.clipboard-copy-failure"))}
        </span>
      )
    : "";

  const sx = { color: color ? cssColor(theme, color) : undefined };
  return (
    <Tooltip open={show && !!message} title={message} placement="top" disableHoverListener disableFocusListener disableTouchListener>
      <span>
        {icon
          ? (
              <IconButton className={btnClass} disabled={copyText === ""} onClick={() => void textToClipboard()} sx={sx}>
                <Icon path={icons.contentCopy} />
              </IconButton>
            )
          : (
              <Button className={btnClass} disabled={copyText === ""} onClick={() => void textToClipboard()} sx={sx} startIcon={<Icon path={icons.contentCopy} />}>
                {i18n.t("general.copy")}
              </Button>
            )}
      </span>
    </Tooltip>
  );
}

export default AppButtonCopy;
