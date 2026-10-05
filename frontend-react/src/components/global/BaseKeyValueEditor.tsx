// Usage: <BaseKeyValueEditor value={record} onChange={setRecord} keyLabel="…" valueLabel="…" />
// Edits a string record: one row per entry (key read-only, value editable, delete button) and a row to add a
// new entry (Enter, the add button, or moving focus out of the row adds it).
import { useState, type FocusEvent, type KeyboardEvent } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import { useI18n } from "@/i18n";
import { icons } from "@/lib/icons";
import { MdiIcon } from "./MdiIcon";

interface BaseKeyValueEditorProps {
  value?: Record<string, string> | null;
  keyLabel?: string;
  valueLabel?: string;
  onChange?: (value: Record<string, string>) => void;
}

export function BaseKeyValueEditor({ value, keyLabel, valueLabel, onChange }: BaseKeyValueEditorProps) {
  const { t } = useI18n();

  const resolvedKeyLabel = keyLabel ?? t("general.key");
  const resolvedValueLabel = valueLabel ?? t("general.value");

  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  function current(): Record<string, string> {
    return { ...(value ?? {}) };
  }

  function addEntry() {
    const key = newKey.trim();
    if (!key) return;
    const updated = current();
    updated[key] = newValue;
    onChange?.(updated);
    setNewKey("");
    setNewValue("");
  }

  function onNewEntryFocusOut(e: FocusEvent<HTMLElement>) {
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      addEntry();
    }
  }

  function onEnter(e: KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      addEntry();
    }
  }

  function updateValue(key: string, newVal: string) {
    const updated = current();
    updated[key] = newVal;
    onChange?.(updated);
  }

  function removeEntry(key: string) {
    const updated = current();
    delete updated[key];
    onChange?.(updated);
  }

  return (
    <div>
      {Object.entries(value ?? {}).map(([key, val]) => (
        <Box key={key} sx={{ display: "flex", alignItems: "center", mb: 1, gap: 1 }}>
          <TextField
            value={key}
            label={resolvedKeyLabel}
            size="small"
            variant="outlined"
            slotProps={{ input: { readOnly: true } }}
            sx={{ flexGrow: 1, mr: 1.5 }}
          />
          <TextField
            value={val}
            label={resolvedValueLabel}
            size="small"
            variant="outlined"
            onChange={event => updateValue(key, event.target.value)}
            sx={{ flexGrow: 1, ml: 1.5 }}
          />
          <IconButton size="small" color="error" onClick={() => removeEntry(key)}>
            <MdiIcon path={icons.delete} />
          </IconButton>
        </Box>
      ))}

      <Box sx={{ display: "flex", alignItems: "center", mt: 1, gap: 1 }} onBlur={onNewEntryFocusOut}>
        <TextField
          value={newKey}
          label={resolvedKeyLabel}
          size="small"
          variant="outlined"
          onChange={event => setNewKey(event.target.value)}
          onKeyDown={onEnter}
          sx={{ flexGrow: 1, mr: 1.5 }}
        />
        <TextField
          value={newValue}
          label={resolvedValueLabel}
          size="small"
          variant="outlined"
          onChange={event => setNewValue(event.target.value)}
          onKeyDown={onEnter}
          sx={{ flexGrow: 1, ml: 1.5 }}
        />
        <IconButton size="small" color="primary" disabled={!newKey.trim()} onClick={addEntry}>
          <MdiIcon path={icons.createAlt} />
        </IconButton>
      </Box>
    </div>
  );
}
