// Usage: <InputColor value={hex} onChange={setHex} /> — "Color" text field with a random-colour button before it
// and a native colour picker after it (replaces Vuetify's colour-picker menu, PROCESS.md §1.5).
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import { useI18n } from "@/i18n";
import { icons } from "@/lib/icons";
import { cssColor } from "./colors";
import { MdiIcon } from "./MdiIcon";

interface InputColorProps {
  value: string;
  onChange?: (value: string) => void;
}

function getRandomHex() {
  return "#000000".replace(/0/g, () => (~~(Math.random() * 16)).toString(16));
}

/** `<input type="color">` only accepts #rrggbb. */
function pickerValue(value: string) {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : "#000000";
}

export function InputColor({ value, onChange }: InputColorProps) {
  const { t } = useI18n();

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
      <ButtonBase
        onClick={() => onChange?.(getRandomHex())}
        sx={theme => ({
          width: 30,
          height: 30,
          minWidth: 30,
          borderRadius: 1,
          color: "white",
          bgcolor: cssColor(theme, value || "grey"),
        })}
      >
        <MdiIcon path={icons.refreshCircle} sx={{ color: "white" }} />
      </ButtonBase>
      <TextField
        value={value ?? ""}
        label={t("general.color")}
        variant="filled"
        sx={{ flexGrow: 1 }}
        onChange={event => onChange?.(event.target.value)}
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <Box component="label" sx={{ position: "relative", display: "inline-flex", cursor: "pointer" }}>
                  <MdiIcon path={icons.formatColorFill} />
                  <input
                    type="color"
                    value={pickerValue(value ?? "")}
                    onChange={event => onChange?.(event.target.value)}
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer" }}
                  />
                </Box>
              </InputAdornment>
            ),
          },
        }}
      />
    </Box>
  );
}
