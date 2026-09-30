import { useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import { icons } from "~/lib/icons";
import { useUserApi } from "~/hooks/api";
import { useI18n } from "~/hooks/use-global-i18n";
import { isThemeColor } from "~/theme/theme";
import { Icon } from "./Icon";

export interface AppButtonUploadProps {
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
  /** Receives the API response (post), or the File / File[] (post=false), or null on failure. */
  onUploaded?: (payload: unknown) => void;
  /** Custom activator (the Vue default slot). */
  children?: (props: { isSelecting: boolean; onButtonClick: () => void }) => ReactNode;
}

export function AppButtonUpload({
  small = false, post = true, url = "", text = "", icon = null, fileName = "archive", textBtn = true, accept = "", color = "info",
  disabled = false, multiple = false, onUploaded, children,
}: AppButtonUploadProps) {
  const i18n = useI18n();
  const api = useUserApi();
  const uploader = useRef<HTMLInputElement>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  async function upload(selectedFiles: File[]) {
    if (selectedFiles.length === 0) return;
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

    const formData = new FormData();
    formData.append(fileName, selectedFiles[0]!);

    try {
      const response = await api.upload.file(url, formData);
      if (response) onUploaded?.(response);
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
    target.value = "";
  }

  function onButtonClick() {
    setIsSelecting(true);
    window.addEventListener("focus", () => setIsSelecting(false), { once: true });
    uploader.current?.click();
  }

  return (
    <>
      <input ref={uploader} style={{ display: "none" }} type="file" accept={accept} multiple={multiple} onChange={onFileChanged} />
      {children
        ? children({ isSelecting, onButtonClick })
        : (
            <Button
              size={small ? "small" : "medium"}
              color={isThemeColor(color) ? color : "inherit"}
              variant={textBtn ? "text" : "contained"}
              disabled={disabled || isSelecting}
              onClick={onButtonClick}
              startIcon={isSelecting ? <CircularProgress size={16} color="inherit" /> : <Icon path={icon || icons.upload} />}
            >
              {text || i18n.t("general.upload")}
            </Button>
          )}
    </>
  );
}

export default AppButtonUpload;
