// Usage: <MarkdownEditor label={t("…")} value={text} onChange={setText} />
//        <MarkdownEditor value={text} onChange={setText} displayPreview={false} preview={isPreview}
//          onPreviewChange={setPreview} textarea={{ hint: t("…"), persistentHint: true }} />
// Auto-growing textarea with an optional edit/preview toggle (SafeMarkdown). The preview state is internal unless
// `preview` is passed (Vue `v-model:preview` → `preview` + `onPreviewChange`).
import { useState } from "react";
import Box from "@mui/material/Box";
import TextField, { type TextFieldProps } from "@mui/material/TextField";
import { useI18n } from "@/i18n";
import { icons } from "@/lib/icons";
import { BaseButtonGroup } from "./BaseButtonGroup";
import { SafeMarkdown } from "./SafeMarkdown";

/** Extra attributes for the textarea (Vue `v-bind="textarea"`). */
export type MarkdownEditorTextarea = Omit<TextFieldProps, "value" | "onChange" | "label" | "variant"> & {
  hint?: string;
  persistentHint?: boolean;
};

interface MarkdownEditorProps {
  label?: string;
  preview?: boolean;
  displayPreview?: boolean;
  textarea?: MarkdownEditorTextarea;
  value?: string;
  onChange?: (value: string) => void;
  onPreviewChange?: (value: boolean) => void;
}

export function MarkdownEditor({
  label = "",
  preview,
  displayPreview = true,
  textarea = {},
  value,
  onChange,
  onPreviewChange,
}: MarkdownEditorProps) {
  const { t } = useI18n();
  const [fallbackPreview, setFallbackPreview] = useState(false);
  const [focused, setFocused] = useState(false);

  const previewState = preview ?? fallbackPreview;

  function togglePreview() {
    const next = !previewState;
    if (preview !== undefined) {
      onPreviewChange?.(next);
    }
    else {
      setFallbackPreview(next);
    }
  }

  const { hint, persistentHint, ...textareaProps } = textarea;

  return (
    <div>
      {displayPreview && (
        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <BaseButtonGroup
            buttons={[
              {
                icon: previewState ? icons.edit : icons.eye,
                text: previewState ? t("general.edit") : t("markdown-editor.preview-markdown-button-label"),
                event: "toggle",
              },
            ]}
            onAction={togglePreview}
          />
        </Box>
      )}
      {!previewState
        ? (
            <TextField
              {...textareaProps}
              fullWidth
              multiline
              minRows={4}
              size="small"
              variant="standard"
              label={label}
              value={value ?? ""}
              helperText={hint && (persistentHint || focused) ? hint : undefined}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onChange={event => onChange?.(event.target.value)}
              sx={{ mt: label === "" ? 0 : 2.5 }}
            />
          )
        : <SafeMarkdown source={value} />}
    </div>
  );
}
