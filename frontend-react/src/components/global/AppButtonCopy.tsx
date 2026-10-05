// Usage: <AppButtonCopy copyText={url} /> · <AppButtonCopy copyText={url} icon={false} color="primary" />
// Copies `copyText` to the clipboard and shows a tooltip for 3 seconds with the result.
import { useEffect, useRef, useState, type ReactNode } from "react";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Slide from "@mui/material/Slide";
import Tooltip from "@mui/material/Tooltip";
import type { Theme } from "@mui/material/styles";
import { useClipboard } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import { icons } from "@/lib/icons";
import { cssColor, isPaletteColor } from "./colors";
import { MdiIcon } from "./MdiIcon";

interface AppButtonCopyProps {
  copyText: string;
  color?: string;
  icon?: boolean;
  btnClass?: string;
  /** Replaces the tooltip text shown when the browser has no clipboard support (Vue default slot). */
  children?: ReactNode;
}

export function AppButtonCopy({ copyText, color = "", icon = true, btnClass = "", children }: AppButtonCopyProps) {
  const { t } = useI18n();
  const { copy, isSupported } = useClipboard();
  const [show, setShow] = useState(false);
  const [copiedSuccess, setCopiedSuccess] = useState<boolean | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function textToClipboard() {
    if (isSupported) {
      try {
        await copy(copyText);
        setCopiedSuccess(true);
        console.info(`Copied\n${copyText}`);
      }
      catch (e) {
        setCopiedSuccess(false);
        console.error("Copy failed: ", e);
      }
    }
    else {
      console.warn("Clipboard is currently not supported by your browser. Ensure you're on a secure (https) site.");
    }

    setShow(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setShow(false), 3000);
  }

  const hasMessage = !isSupported || copiedSuccess !== null;
  const tooltip = hasMessage
    ? (
        <span>
          <MdiIcon path={icons.clipboardCheck} sx={{ mr: 1, verticalAlign: "middle" }} />
          {!isSupported
            ? (children ?? t("general.your-browser-does-not-support-clipboard"))
            : (copiedSuccess ? t("general.copied_message") : t("general.clipboard-copy-failure"))}
        </span>
      )
    : "";

  const paletteColor = isPaletteColor(color) ? color : "inherit";
  const colorSx = color && !isPaletteColor(color) ? (theme: Theme) => ({ color: cssColor(theme, color) }) : undefined;
  const disabled = copyText === "";

  return (
    <Tooltip
      title={tooltip}
      open={show && hasMessage}
      placement="top"
      disableHoverListener
      disableFocusListener
      disableTouchListener
      slots={{ transition: Slide }}
    >
      <span>
        {icon
          ? (
              <IconButton className={btnClass} color={paletteColor} sx={colorSx} disabled={disabled} onClick={() => void textToClipboard()}>
                <MdiIcon path={icons.contentCopy} />
              </IconButton>
            )
          : (
              <Button className={btnClass} color={paletteColor} sx={colorSx} disabled={disabled} startIcon={<MdiIcon path={icons.contentCopy} />} onClick={() => void textToClipboard()}>
                {t("general.copy")}
              </Button>
            )}
      </span>
    </Tooltip>
  );
}
