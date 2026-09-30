import { useState } from "react";
import Box from "@mui/material/Box";
import { icons } from "~/lib/icons";
import { useI18n } from "~/hooks/use-global-i18n";
import { BaseButtonGroup } from "./BaseButtonGroup";
import { SafeMarkdown } from "./SafeMarkdown";
import { TextInput } from "./form";
import type { TextInputProps } from "./form";

export interface MarkdownEditorProps {
  value: string | null | undefined;
  onChange?: (value: string) => void;
  label?: string;
  preview?: boolean;
  onPreviewChange?: (value: boolean) => void;
  displayPreview?: boolean;
  textarea?: Partial<TextInputProps>;
}

export function MarkdownEditor({ value, onChange, label = "", preview, onPreviewChange, displayPreview = true, textarea = {} }: MarkdownEditorProps) {
  const i18n = useI18n();
  const [fallbackPreview, setFallbackPreview] = useState(false);
  const previewState = preview ?? fallbackPreview;
  const setPreview = (val: boolean) => {
    if (preview !== undefined) onPreviewChange?.(val);
    else setFallbackPreview(val);
  };

  return (
    <div>
      {displayPreview && (
        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <BaseButtonGroup
            buttons={[{
              icon: previewState ? icons.edit : icons.eye,
              text: previewState ? i18n.t("general.edit") : i18n.t("markdown-editor.preview-markdown-button-label"),
              event: "toggle",
            }]}
            onEvent={() => setPreview(!previewState)}
          />
        </Box>
      )}
      {!previewState
        ? (
            <TextInput
              {...textarea}
              value={value}
              onChange={onChange}
              sx={label === "" ? undefined : { mt: 2.5 }}
              label={label || undefined}
              multiline
              autoGrow
              rows={4}
              variant="underlined"
            />
          )
        : <SafeMarkdown source={value} />}
    </div>
  );
}

export default MarkdownEditor;
