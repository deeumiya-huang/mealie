// Usage: <RecipeDataAliasManagerDialog open={open} onOpenChange={setOpen} data={food} onSubmit={aliases => …}
//          onCancel={() => setOpen(false)} /> — dialog to edit the aliases of a food or unit. Vue `v-model` →
// `open` + `onOpenChange`; `@submit`/`@cancel` → `onSubmit(aliases)`/`onCancel()`. The aliases are a local copy that is
// re-read from `data` each time the dialog opens; `data` itself is never changed.
import { useState } from "react";
import Box from "@mui/material/Box";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import { BaseButton } from "@/components/global/BaseButton";
import { BaseButtonGroup } from "@/components/global/BaseButtonGroup";
import { BaseDialog } from "@/components/global/BaseDialog";
import { validators } from "@/hooks/use-validators";
import { useI18n } from "@/i18n";
import type { IngredientFood, IngredientUnit } from "@/lib/api/types/recipe";
import { icons } from "@/lib/icons";

export interface GenericAlias {
  name: string;
}

interface RecipeDataAliasManagerDialogProps {
  data: IngredientFood | IngredientUnit;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSubmit?: (aliases: GenericAlias[]) => void;
  onCancel?: () => void;
}

function readAliases(data: IngredientFood | IngredientUnit): GenericAlias[] {
  const aliases = (data.aliases || []).map(alias => ({ ...alias }));
  if (!aliases.length) {
    aliases.push({ name: "" });
  }
  return aliases;
}

export function RecipeDataAliasManagerDialog({
  data,
  open = false,
  onOpenChange,
  onSubmit,
  onCancel,
}: RecipeDataAliasManagerDialogProps) {
  const { t } = useI18n();

  const [aliases, setAliases] = useState<GenericAlias[]>(() => readAliases(data));
  // rows the user has typed in; only those show their validation message (Vuetify validates on input)
  const [touched, setTouched] = useState<number[]>([]);

  // the aliases are re-read from `data` whenever the dialog opens (Vue: whenever(dialog))
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setAliases(readAliases(data));
      setTouched([]);
    }
  }

  function createAlias() {
    setAliases(current => [...current, { name: "" }]);
  }

  function deleteAlias(index: number) {
    setAliases(current => current.filter((_alias, i) => i !== index));
    setTouched(current => current.filter(i => i !== index).map(i => (i > index ? i - 1 : i)));
  }

  function renameAlias(index: number, name: string) {
    setAliases(current => current.map((alias, i) => (i === index ? { ...alias, name } : alias)));
    setTouched(current => (current.includes(index) ? current : [...current, index]));
  }

  function saveAliases() {
    const seenAliasNames: string[] = [];
    const keepAliases: GenericAlias[] = [];
    aliases.forEach((alias) => {
      const abbreviation = "abbreviation" in data ? data.abbreviation : undefined;
      const pluralAbbreviation = "pluralAbbreviation" in data ? data.pluralAbbreviation : undefined;
      if (
        !alias.name
        || alias.name === data.name
        || alias.name === data.pluralName
        || alias.name === abbreviation
        || alias.name === pluralAbbreviation
        || seenAliasNames.includes(alias.name)
      ) {
        return;
      }

      keepAliases.push(alias);
      seenAliasNames.push(alias.name);
    });

    setAliases(keepAliases);
    onSubmit?.(keepAliases);
  }

  return (
    <Box>
      <BaseDialog
        open={open}
        onOpenChange={onOpenChange}
        title={t("data-pages.manage-aliases")}
        icon={icons.edit}
        submitIcon={icons.check}
        submitText={t("general.confirm")}
        canSubmit
        onSubmit={saveAliases}
        onCancel={onCancel}
        customCardAction={(
          <BaseButton edit icon={icons.create} onClick={createAlias}>
            {t("data-pages.create-alias")}
          </BaseButton>
        )}
      >
        <CardContent>
          <Container>
            {aliases.map((alias, i) => {
              const rule = validators.required(alias.name);
              const error = touched.includes(i) && rule !== true;
              return (
                <Grid container spacing={2} key={i} sx={{ alignItems: "center" }}>
                  <Grid size={10}>
                    <TextField
                      fullWidth
                      variant="standard"
                      label={t("general.name")}
                      value={alias.name}
                      error={error}
                      helperText={error ? String(rule) : undefined}
                      onChange={event => renameAlias(i, event.target.value)}
                    />
                  </Grid>
                  <Grid size={2}>
                    <BaseButtonGroup
                      buttons={[{ icon: icons.delete, text: t("general.delete"), event: "delete" }]}
                      onAction={() => deleteAlias(i)}
                    />
                  </Grid>
                </Grid>
              );
            })}
          </Container>
        </CardContent>
      </BaseDialog>
    </Box>
  );
}
