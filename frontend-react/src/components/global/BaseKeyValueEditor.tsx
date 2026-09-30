import { useState } from "react";
import type { FocusEvent } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import { icons } from "~/lib/icons";
import { useI18n } from "~/hooks/use-global-i18n";
import { Icon } from "./Icon";

export interface BaseKeyValueEditorProps {
  value?: Record<string, string> | null;
  onChange: (value: Record<string, string>) => void;
  keyLabel?: string;
  valueLabel?: string;
}

export function BaseKeyValueEditor({ value, onChange, keyLabel, valueLabel }: BaseKeyValueEditorProps) {
  const i18n = useI18n();
  const resolvedKeyLabel = keyLabel ?? i18n.t("general.key");
  const resolvedValueLabel = valueLabel ?? i18n.t("general.value");
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  const current = () => ({ ...(value ?? {}) });

  function addEntry() {
    const key = newKey.trim();
    if (!key) return;
    const updated = current();
    updated[key] = newValue;
    onChange(updated);
    setNewKey("");
    setNewValue("");
  }

  function onNewEntryFocusOut(e: FocusEvent<HTMLDivElement>) {
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      addEntry();
    }
  }

  return (
    <div>
      {Object.entries(value ?? {}).map(([key, val]) => (
        <Box key={key} sx={{ display: "flex", alignItems: "center", mb: 1, gap: 1 }}>
          <TextField value={key} label={resolvedKeyLabel} size="small" slotProps={{ input: { readOnly: true } }} sx={{ flexGrow: 1, mr: 1.5 }} />
          <TextField
            value={val}
            label={resolvedValueLabel}
            size="small"
            sx={{ flexGrow: 1, ml: 1.5 }}
            onChange={(e) => {
              const updated = current();
              updated[key] = e.target.value;
              onChange(updated);
            }}
          />
          <IconButton
            color="error"
            size="small"
            onClick={() => {
              const updated = current();
              delete updated[key];
              onChange(updated);
            }}
          >
            <Icon path={icons.delete} />
          </IconButton>
        </Box>
      ))}

      <Box sx={{ display: "flex", alignItems: "center", mt: 1, gap: 1 }} onBlur={onNewEntryFocusOut}>
        <TextField
          value={newKey}
          onChange={e => setNewKey(e.target.value)}
          label={resolvedKeyLabel}
          size="small"
          sx={{ flexGrow: 1, mr: 1.5 }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addEntry();
            }
          }}
        />
        <TextField
          value={newValue}
          onChange={e => setNewValue(e.target.value)}
          label={resolvedValueLabel}
          size="small"
          sx={{ flexGrow: 1, ml: 1.5 }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addEntry();
            }
          }}
        />
        <IconButton color="primary" size="small" disabled={!newKey.trim()} onClick={addEntry}>
          <Icon path={icons.createAlt} />
        </IconButton>
      </Box>
    </div>
  );
}

export default BaseKeyValueEditor;
