import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Popover from "@mui/material/Popover";
import { icons } from "~/lib/icons";
import { useI18n } from "~/hooks/use-global-i18n";
import { Icon } from "./Icon";
import { TextInput } from "./form";

const SWATCHES = [
  "#F44336", "#E91E63", "#9C27B0", "#673AB7", "#3F51B5", "#2196F3", "#03A9F4", "#00BCD4", "#009688", "#4CAF50",
  "#8BC34A", "#CDDC39", "#FFEB3B", "#FFC107", "#FF9800", "#FF5722", "#795548", "#607D8B", "#9E9E9E", "#000000",
];

function getRandomHex() {
  return "#000000".replace(/0/g, () => (~~(Math.random() * 16)).toString(16));
}

/** Color text field with a random-color button and a swatch/native picker (v-color-picker). */
export function InputColor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const i18n = useI18n();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, width: "100%" }}>
      <Button
        variant="contained"
        size="small"
        onClick={() => onChange(getRandomHex())}
        sx={{ minWidth: 30, width: 30, height: 30, p: 0, mt: 0.5, bgcolor: value || "grey.500", boxShadow: "none" }}
      >
        <Icon path={icons.refreshCircle} color="white" />
      </Button>
      <TextInput
        value={value}
        onChange={onChange}
        label={i18n.t("general.color")}
        appendInner={(
          <InputAdornment position="end">
            <IconButton size="small" onClick={e => setAnchor(e.currentTarget)}>
              <Icon path={icons.formatColorFill} />
            </IconButton>
          </InputAdornment>
        )}
      />
      <Popover open={!!anchor} anchorEl={anchor} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: "bottom", horizontal: "left" }}>
        <Box sx={{ p: 1.5, width: 260 }}>
          <input
            type="color"
            value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"}
            onChange={e => onChange(e.target.value.toUpperCase())}
            style={{ width: "100%", height: 120, border: "none", padding: 0, background: "none" }}
          />
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: 0.5, mt: 1, maxHeight: 200 }}>
            {SWATCHES.map(swatch => (
              <Box
                key={swatch}
                role="button"
                aria-label={swatch}
                onClick={() => onChange(swatch)}
                sx={{ width: 20, height: 20, borderRadius: 0.5, bgcolor: swatch, cursor: "pointer", outline: value === swatch ? "2px solid" : "none" }}
              />
            ))}
          </Box>
        </Box>
      </Popover>
    </Box>
  );
}

export default InputColor;
