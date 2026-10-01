import { useState } from "react";
import type { ReactNode } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import ListItemText from "@mui/material/ListItemText";
import { BaseDialog } from "~/components/global/BaseDialog";
import { AutocompleteInput } from "~/components/global/form";
import { useI18n } from "~/hooks/use-global-i18n";
import { useLocales } from "~/hooks/use-locales";
import { normalizeFilter } from "~/hooks/use-utils";

interface Mergeable {
  id: string;
  name: string;
}

export interface GroupDataMergeDialogProps<T extends Mergeable> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  icon: string;
  title: string;
  description: ReactNode;
  sourceLabel: string;
  targetLabel: string;
  items: T[];
  /** "Merging X into Y" preview text. */
  example: (from: T, to: T) => string;
  onMerge: (from: T, to: T) => Promise<boolean>;
}

/** "Combine" dialog of the foods/units data pages: pick a source and a target item. */
export function GroupDataMergeDialog<T extends Mergeable>({
  open, onOpenChange, icon, title, description, sourceLabel, targetLabel, items, example, onMerge,
}: GroupDataMergeDialogProps<T>) {
  const [from, setFrom] = useState<T | null>(null);
  const [to, setTo] = useState<T | null>(null);
  const canMerge = !!from && !!to && from.id !== to.id;

  const picker = (label: string, value: T | null, onChange: (v: T | null) => void, sx?: object) => (
    <AutocompleteInput<T>
      value={value}
      onChange={(v: T | null) => onChange(v)}
      returnObject
      items={items}
      customFilter={(itemTitle, query) => normalizeFilter(itemTitle, query)}
      itemTitle="name"
      label={label}
      sx={sx}
    />
  );

  return (
    <BaseDialog
      open={open}
      onOpenChange={onOpenChange}
      bottomSheet
      icon={icon}
      title={title}
      canConfirm
      onConfirm={() => {
        if (canMerge) void onMerge(from, to);
      }}
    >
      <Box sx={{ px: 2, pb: 2 }}>
        <div>{description}</div>
        {picker(sourceLabel, from, setFrom, { mt: 1 })}
        {picker(targetLabel, to, setTo)}
        {canMerge && <Box sx={{ textAlign: "center" }}>{example(from, to)}</Box>}
      </Box>
    </BaseDialog>
  );
}

export interface GroupDataSeedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  icon: string;
  text: string;
  /** Show the "existing data" warning. */
  hasData: boolean;
  onSeed: (locale: string) => void;
}

/** "Seed data" dialog of the foods/units data pages. */
export function GroupDataSeedDialog({ open, onOpenChange, icon, text, hasData, onSeed }: GroupDataSeedDialogProps) {
  const i18n = useI18n();
  const { locales: LOCALES, locale: currentLocale, availableLocaleCodes } = useLocales();
  const locales = LOCALES.filter(locale => availableLocaleCodes.includes(locale.value));
  const [locale, setLocale] = useState(currentLocale);

  return (
    <BaseDialog
      open={open}
      onOpenChange={onOpenChange}
      bottomSheet
      icon={icon}
      title={i18n.t("data-pages.seed-data")}
      canConfirm
      onConfirm={() => onSeed(locale)}
    >
      <Box sx={{ px: 2, pb: 2 }}>
        <Box sx={{ pb: 1 }}>{text}</Box>
        <AutocompleteInput<(typeof LOCALES)[number]>
          value={locale}
          onChange={(v: string | null) => setLocale(v ?? "")}
          items={locales}
          itemTitle="name"
          itemValue="value"
          customFilter={(itemTitle, query) => normalizeFilter(itemTitle, query)}
          label={i18n.t("data-pages.select-language")}
          sx={{ my: 1.5 }}
          hideDetails
          variant="outlined"
          renderItem={item => (
            <ListItemText
              primary={item.name}
              secondary={`${item.progress}% ${i18n.t("language-dialog.translated")}`}
            />
          )}
        />
        {hasData && (
          <Alert severity="error" variant="filled" sx={{ mb: 0, typography: "body2" }}>
            {i18n.t("data-pages.foods.seed-dialog-warning")}
          </Alert>
        )}
      </Box>
    </BaseDialog>
  );
}
