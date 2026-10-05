// Usage: <LanguageDialog open={open} onOpenChange={setOpen} /> — pick the UI language; closes once it changed.
import { useState } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import CardContent from "@mui/material/CardContent";
import Link from "@mui/material/Link";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useLocales } from "@/hooks/use-locales";
import type { LocaleInfo } from "@/hooks/use-locales/available-locales";
import { normalizeFilter } from "@/hooks/use-utils";
import { I18nT } from "@/i18n/I18nT";
import { icons } from "@/lib/icons";
import { BaseDialog } from "./BaseDialog";

interface LanguageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LanguageDialog({ open, onOpenChange }: LanguageDialogProps) {
  const { locales, locale, setLocale, i18n } = useLocales();
  const { t } = i18n;
  const [selectedLocale, setSelectedLocale] = useState(locale);
  const selected = locales.find(lc => lc.value === selectedLocale) ?? null;

  async function onLocaleSelect(value: LocaleInfo | null) {
    setSelectedLocale(value?.value ?? "");
    if (value && locales.some(l => l.value === value.value)) {
      await setLocale(value.value);
      // close the dialog when the locale changes (Vue: watch(locale))
      if (value.value !== locale) onOpenChange(false);
    }
  }

  return (
    <BaseDialog
      open={open}
      onOpenChange={onOpenChange}
      bottomSheet
      icon={icons.translate}
      title={t("language-dialog.choose-language")}
    >
      <CardContent>
        {t("language-dialog.select-description")}
        <Autocomplete
          sx={{ my: 1.5 }}
          options={locales}
          value={selected}
          getOptionLabel={option => option.name}
          isOptionEqualToValue={(option, value) => option.value === value.value}
          filterOptions={(options, { inputValue }) => options.filter(option => normalizeFilter(option.name, inputValue))}
          onChange={(_event, value) => void onLocaleSelect(value)}
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
            <TextField
              {...params}
              variant="outlined"
              slotProps={{ ...params.slotProps, htmlInput: { ...params.slotProps.htmlInput, "aria-label": t("language-dialog.choose-language") } }}
            />
          )}
        />
        <I18nT
          keypath="language-dialog.how-to-contribute-description"
          slots={{
            "read-the-docs-link": (
              <Link href="https://docs.mealie.io/contributors/translating/" target="_blank" color="primary">
                {t("language-dialog.read-the-docs")}
              </Link>
            ),
          }}
        />
      </CardContent>
    </BaseDialog>
  );
}
