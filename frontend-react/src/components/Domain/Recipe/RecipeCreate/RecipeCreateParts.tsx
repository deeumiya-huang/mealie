// Usage: building blocks shared by the recipe importers (pages/g/[groupSlug]/r/create/*), the pieces their Vue templates
// repeat: <RecipeCreateTitle>, <RecipeCreateText>, <RecipeCreateTextField label hint icon value onChange />,
// <RecipeCreateOption label checked onChange />, <RecipeCreateSubmit loading status />, <RecipeCreateErrorAlert>…</…>.
import { useId, type ChangeEvent, type ReactNode } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import CardActions from "@mui/material/CardActions";
import Checkbox from "@mui/material/Checkbox";
import Collapse from "@mui/material/Collapse";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import type { SxProps, Theme } from "@mui/material/styles";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { BaseButton } from "@/components/global/BaseButton";
import { MdiIcon } from "@/components/global/MdiIcon";
import { useI18n } from "@/i18n";
import { icons } from "@/lib/icons";

/** `v-card-title class="headline"` */
export function RecipeCreateTitle({ children }: { children?: ReactNode }) {
  return (
    <Typography component="div" sx={{ fontSize: "1.25rem", fontWeight: 500, lineHeight: 1.6, px: 2, py: 1 }}>
      {children}
    </Typography>
  );
}

/** `v-card-text` */
export function RecipeCreateText({ children, sx }: { children?: ReactNode; sx?: SxProps<Theme> }) {
  return (
    <Box sx={[{ p: 2, fontSize: "0.875rem", lineHeight: 1.425 }, ...(Array.isArray(sx) ? sx : [sx])]}>
      {children}
    </Box>
  );
}

interface RecipeCreateTextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Called when the field loses focus (Vuetify `validate-on="blur"`). */
  onBlur?: () => void;
  /** Called when the clear button is used (default: `onChange("")`). */
  onClear?: () => void;
  /** Icon inside the field (`prepend-inner-icon`). */
  icon?: string;
  /** Persistent hint, shown below the field unless there is an error. */
  hint?: string;
  error?: string | null;
  clearable?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  multiline?: boolean;
  onEnter?: () => void;
  sx?: SxProps<Theme>;
}

/** The `variant="solo-filled" rounded clearable` text field of the importers. */
export function RecipeCreateTextField({
  label,
  value,
  onChange,
  onBlur,
  onClear,
  icon,
  hint,
  error = null,
  clearable = true,
  disabled = false,
  autoFocus = false,
  multiline = false,
  onEnter,
  sx,
}: RecipeCreateTextFieldProps) {
  const { t } = useI18n();
  const id = useId();

  return (
    <TextField
      id={id}
      fullWidth
      variant="filled"
      label={label}
      value={value}
      autoFocus={autoFocus}
      disabled={disabled}
      multiline={multiline}
      minRows={multiline ? 5 : undefined}
      error={error !== null}
      helperText={error ?? hint}
      onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
      onBlur={onBlur}
      onKeyUp={(event) => {
        if (event.key === "Enter") onEnter?.();
      }}
      slotProps={{
        input: {
          disableUnderline: true,
          startAdornment: icon
            ? <InputAdornment position="start"><MdiIcon path={icon} /></InputAdornment>
            : undefined,
          endAdornment: clearable && value
            ? (
                <InputAdornment position="end">
                  <IconButton size="small" edge="end" disabled={disabled} aria-label={t("general.clear")} onClick={onClear ?? (() => onChange(""))}>
                    <MdiIcon path={icons.close} size="small" />
                  </IconButton>
                </InputAdornment>
              )
            : undefined,
        },
        formHelperText: { sx: { mx: 2 } },
      }}
      sx={[
        { "& .MuiFilledInput-root": { borderRadius: "24px", overflow: "hidden" } },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    />
  );
}

interface RecipeCreateOptionProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

/** `<v-checkbox color="primary" hide-details :label>` */
export function RecipeCreateOption({ label, checked, onChange, disabled = false }: RecipeCreateOptionProps) {
  return (
    <FormControlLabel
      label={label}
      disabled={disabled}
      sx={{ display: "flex", mx: 0 }}
      control={<Checkbox color="primary" checked={checked} onChange={event => onChange(event.target.checked)} />}
    />
  );
}

interface RecipeCreateSubmitProps {
  loading?: boolean;
  disabled?: boolean;
  type?: "submit" | "button";
  onClick?: () => void;
  /** Progress message streamed by the backend; `undefined` for pages without one. */
  status?: string | null;
  showStatus?: boolean;
  color?: string;
  icon?: string;
  text?: string;
}

/** The centred 250px create button, with the backend progress message below it. */
export function RecipeCreateSubmit({
  loading = false,
  disabled = false,
  type = "submit",
  onClick,
  status = null,
  showStatus = true,
  color,
  icon,
  text,
}: RecipeCreateSubmitProps) {
  return (
    <CardActions sx={{ justifyContent: "center" }}>
      <Box sx={{ width: "100%", textAlign: "center" }}>
        <Box sx={{ width: 250, mx: "auto" }}>
          <BaseButton
            type={type}
            fullWidth
            loading={loading}
            disabled={disabled}
            color={color}
            icon={icon}
            text={text}
            sx={{ borderRadius: "24px" }}
            onClick={onClick}
          />
        </Box>
        {showStatus && (
          <RecipeCreateText sx={{ py: 1 }}>
            {/* render a non-breaking space to maintain layout */}
            {`${status ?? ""}\u00a0`}
          </RecipeCreateText>
        )}
      </Box>
    </CardActions>
  );
}

/** The red "error" card with the robot icon that expands under the form (`v-expand-transition` + `v-alert`). */
export function RecipeCreateErrorAlert({ open, children }: { open: boolean; children?: ReactNode }) {
  const { t } = useI18n();

  return (
    <Collapse in={open} unmountOnExit>
      <Alert
        variant="filled"
        severity="error"
        icon={false}
        sx={{ "mt": 3, "color": "common.white", "& a": { color: "common.white" }, "& .MuiAlert-message": { width: "100%" } }}
      >
        <Typography component="div" sx={{ display: "flex", alignItems: "center", fontSize: "1.25rem", fontWeight: 500, lineHeight: 1.6 }}>
          <MdiIcon path={icons.robot} size="x-large" sx={{ mr: 1, color: "common.white" }} />
          {t("new-recipe.error-title")}
        </Typography>
        <Divider sx={{ my: 1.5, mx: 1, borderColor: "rgba(255, 255, 255, 0.4)" }} />
        {children}
      </Alert>
    </Collapse>
  );
}

/** The three documentation links at the bottom of the url / html error card. */
export function RecipeCreateErrorLinks() {
  const { t } = useI18n();
  const links = [
    { href: "https://developers.google.com/search/docs/data-types/recipe", text: t("new-recipe.google-ld-json-info") },
    { href: "https://github.com/mealie-recipes/mealie/issues", text: t("new-recipe.github-issues") },
    { href: "https://schema.org/Recipe", text: t("new-recipe.recipe-markup-specification") },
  ];

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "space-around", my: 1.5 }}>
      {links.map(link => (
        <a key={link.href} href={link.href} target="_blank" rel="noreferrer nofollow">
          {link.text}
        </a>
      ))}
    </Box>
  );
}
