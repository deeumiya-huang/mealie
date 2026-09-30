import { useState } from "react";
import CardContent from "@mui/material/CardContent";
import ListItemText from "@mui/material/ListItemText";
import { icons } from "~/lib/icons";
import { useI18n } from "~/hooks/use-global-i18n";
import { useLocales } from "~/hooks/use-locales";
import { normalizeFilter } from "~/hooks/use-utils";
import { BaseDialog } from "./BaseDialog";
import { I18nT } from "./I18nT";
import { AutocompleteInput } from "./form";

export function LanguageDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const i18n = useI18n();
  const { locales: LOCALES, locale, setLocale, availableLocaleCodes } = useLocales();
  const [selectedLocale, setSelectedLocale] = useState<string | null>(locale);
  const locales = LOCALES.filter(lc => availableLocaleCodes.includes(lc.value));

  const onLocaleSelect = (value: string | null) => {
    setSelectedLocale(value);
    if (value && locales.some(l => l.value === value)) {
      void setLocale(value).then(() => onOpenChange(false)); // Close dialog when locale changes
    }
  };

  return (
    <BaseDialog
      open={open}
      onOpenChange={onOpenChange}
      bottomSheet
      icon={icons.translate}
      title={i18n.t("language-dialog.choose-language")}
    >
      <CardContent>
        {i18n.t("language-dialog.select-description")}
        <AutocompleteInput
          value={selectedLocale}
          onChange={(v: string | null) => onLocaleSelect(v)}
          items={locales}
          itemTitle="name"
          itemValue="value"
          customFilter={(title, query) => normalizeFilter(title, query)}
          sx={{ my: 1.5 }}
          hideDetails
          renderItem={item => (
            <ListItemText primary={item.name} secondary={`${item.progress}% ${i18n.t("language-dialog.translated")}`} />
          )}
        />
        <I18nT
          keypath="language-dialog.how-to-contribute-description"
          slots={{
            "read-the-docs-link": (
              <a href="https://docs.mealie.io/contributors/translating/" target="_blank" rel="noreferrer" style={{ color: "inherit" }}>
                {i18n.t("language-dialog.read-the-docs")}
              </a>
            ),
          }}
        />
      </CardContent>
    </BaseDialog>
  );
}

export default LanguageDialog;
