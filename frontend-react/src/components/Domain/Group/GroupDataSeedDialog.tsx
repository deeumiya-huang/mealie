// Usage: <GroupDataSeedDialog open={open} onOpenChange={setOpen} text={t("data-pages.foods.seed-dialog-text")}
//          locale={locale} onLocaleChange={setLocale} showWarning={foods.length > 0} onConfirm={seedDatabase} />
// The "seed data" dialog shared by the foods and units data pages: pick the language of the seed data (with each
// language's translation progress) and confirm. `showWarning` adds the "existing data" warning.
import Alert from "@mui/material/Alert";
import Autocomplete, { createFilterOptions } from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import CardContent from "@mui/material/CardContent";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { BaseDialog } from "@/components/global/BaseDialog";
import { LOCALES, type LocaleInfo } from "@/hooks/use-locales/available-locales";
import { normalizeFilter } from "@/hooks/use-utils";
import { useI18n } from "@/i18n";
import { icons } from "@/lib/icons";

interface GroupDataSeedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The description shown above the language picker. */
  text: string;
  locale: string;
  onLocaleChange: (locale: string) => void;
  /** Show the warning that seeding adds to the existing data. */
  showWarning?: boolean;
  /** Filter the languages with `normalizeFilter` (diacritics/ligatures folded) instead of a plain substring match. */
  normalizeSearch?: boolean;
  onConfirm: () => void;
}

const defaultFilter = createFilterOptions<LocaleInfo>();

export function GroupDataSeedDialog({
  open,
  onOpenChange,
  text,
  locale,
  onLocaleChange,
  showWarning = false,
  normalizeSearch = false,
  onConfirm,
}: GroupDataSeedDialogProps) {
  const { t } = useI18n();

  return (
    <BaseDialog
      open={open}
      onOpenChange={onOpenChange}
      bottomSheet
      icon={icons.foods}
      title={t("data-pages.seed-data")}
      canConfirm
      onConfirm={onConfirm}
    >
      <CardContent>
        <Box sx={{ pb: 1 }}>
          {text}
        </Box>
        <Autocomplete
          sx={{ my: 1.5 }}
          options={LOCALES}
          value={LOCALES.find(item => item.value === locale) ?? null}
          onChange={(_event, value) => onLocaleChange(value?.value ?? "")}
          getOptionLabel={option => option.name}
          isOptionEqualToValue={(option, value) => option.value === value.value}
          filterOptions={(options, state) => (normalizeSearch
            ? options.filter(option => normalizeFilter(option.name, state.inputValue))
            : defaultFilter(options, state))}
          renderOption={({ key, ...props }, option) => (
            <Box component="li" key={key} {...props} sx={{ display: "block !important", px: 2, py: 1 }}>
              <Typography variant="body1">{option.name}</Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {option.progress}
                %
                {" "}
                {t("language-dialog.translated")}
              </Typography>
            </Box>
          )}
          renderInput={params => (
            <TextField {...params} variant="outlined" label={t("data-pages.select-language")} />
          )}
        />

        {showWarning && (
          <Alert severity="error" variant="filled" sx={{ mb: 0, typography: "body2" }}>
            {t("data-pages.foods.seed-dialog-warning")}
          </Alert>
        )}
      </CardContent>
    </BaseDialog>
  );
}
