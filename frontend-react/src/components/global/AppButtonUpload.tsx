// Usage: <AppButtonUpload url="/api/…" fileName="archive" accept=".zip" onUploaded={result => …} />
// `renderButton({ isSelecting, onButtonClick })` replaces the default button (Vue default slot).
// With `post={false}` the selected file(s) are emitted without calling the API.
import { useState, type ChangeEvent, type ReactNode } from "react";
import Button from "@mui/material/Button";
import type { Theme } from "@mui/material/styles";
import { useUserApi } from "@/hooks/api";
import { useI18n } from "@/i18n";
import { icons } from "@/lib/icons";
import { cssColor, isPaletteColor } from "./colors";
import { MdiIcon } from "./MdiIcon";

interface AppButtonUploadProps {
  small?: boolean;
  post?: boolean;
  url?: string;
  text?: string;
  icon?: string | null;
  fileName?: string;
  textBtn?: boolean;
  accept?: string;
  color?: string;
  disabled?: boolean;
  multiple?: boolean;
  onUploaded?: (payload: File | File[] | unknown | null) => void;
  renderButton?: (slot: { isSelecting: boolean; onButtonClick: () => void }) => ReactNode;
}

export function AppButtonUpload({
  small = false,
  post = true,
  url = "",
  text = "",
  icon = null,
  fileName = "archive",
  textBtn = true,
  accept = "",
  color = "info",
  disabled = false,
  multiple = false,
  onUploaded,
  renderButton,
}: AppButtonUploadProps) {
  const { t } = useI18n();
  const api = useUserApi();
  const [uploader, setUploader] = useState<HTMLInputElement | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  const effIcon = icon || icons.upload;
  const defaultText = t("general.upload");

  async function upload(selectedFiles: File[]) {
    if (selectedFiles.length === 0) {
      return;
    }

    setIsSelecting(true);

    if (!post) {
      onUploaded?.(multiple ? selectedFiles : selectedFiles[0]);
      setIsSelecting(false);
      return;
    }

    if (multiple && selectedFiles.length > 1) {
      console.warn("Multiple file uploads are not supported by the API.");
      return;
    }

    const file = selectedFiles[0];
    const formData = new FormData();
    formData.append(fileName, file);

    try {
      const response = await api.upload.file(url, formData);
      if (response) {
        onUploaded?.(response);
      }
    }
    catch (e) {
      console.error(e);
      onUploaded?.(null);
    }

    setIsSelecting(false);
  }

  function onFileChanged(e: ChangeEvent<HTMLInputElement>) {
    const target = e.target;

    if (target.files !== null && target.files.length > 0) {
      void upload(Array.from(target.files));
    }
  }

  function onButtonClick() {
    setIsSelecting(true);
    window.addEventListener("focus", () => setIsSelecting(false), { once: true });
    uploader?.click();
  }

  return (
    <form onSubmit={event => event.preventDefault()}>
      <input
        ref={setUploader}
        style={{ display: "none" }}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={onFileChanged}
      />
      {renderButton
        ? renderButton({ isSelecting, onButtonClick })
        : (
            <Button
              loading={isSelecting}
              size={small ? "small" : "medium"}
              color={isPaletteColor(color) ? color : "inherit"}
              sx={!isPaletteColor(color) ? (theme: Theme) => ({ color: cssColor(theme, color) }) : undefined}
              variant={textBtn ? "text" : "contained"}
              disabled={disabled}
              startIcon={<MdiIcon path={effIcon} />}
              onClick={onButtonClick}
            >
              {text ? text : defaultText}
            </Button>
          )}
    </form>
  );
}
