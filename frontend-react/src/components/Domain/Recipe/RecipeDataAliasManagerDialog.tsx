import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import { BaseButton } from "~/components/global/BaseButton";
import { BaseButtonGroup } from "~/components/global/BaseButtonGroup";
import { BaseDialog } from "~/components/global/BaseDialog";
import { Icon } from "~/components/global/Icon";
import { TextInput } from "~/components/global/form";
import { useI18n } from "~/hooks/use-global-i18n";
import { validators } from "~/hooks/use-validators";
import { icons } from "~/lib/icons";
import type { IngredientFood, IngredientUnit } from "~/lib/api/types/recipe";

export interface GenericAlias {
  name: string;
}

export interface RecipeDataAliasManagerDialogProps {
  data: IngredientFood | IngredientUnit;
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  onSubmit?: (aliases: GenericAlias[]) => void;
  onCancel?: () => void;
}

function initialAliases(data: IngredientFood | IngredientUnit): GenericAlias[] {
  const aliases = (data.aliases || []).map(alias => ({ ...alias }));
  return aliases.length ? aliases : [{ name: "" }];
}

export function RecipeDataAliasManagerDialog({ data, open, onOpenChange, onSubmit, onCancel }: RecipeDataAliasManagerDialogProps) {
  const i18n = useI18n();
  // Edits work on a copy; it is re-read from `data` every time the dialog opens
  const [aliases, setAliases] = useState<GenericAlias[]>(() => initialAliases(data));

  useEffect(() => {
    if (open) {
      setAliases(initialAliases(data));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- re-initialise when opened (Vue `whenever(dialog)`)
  }, [open]);

  function createAlias() {
    setAliases(prev => [...prev, { name: "" }]);
  }

  function deleteAlias(index: number) {
    setAliases(prev => prev.filter((_, i) => i !== index));
  }

  function saveAliases() {
    const seenAliasNames: string[] = [];
    const keepAliases: GenericAlias[] = [];
    const abbreviation = "abbreviation" in data ? data.abbreviation : undefined;
    const pluralAbbreviation = "pluralAbbreviation" in data ? data.pluralAbbreviation : undefined;
    aliases.forEach((alias) => {
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
    <BaseDialog
      open={open}
      onOpenChange={onOpenChange}
      title={i18n.t("data-pages.manage-aliases")}
      icon={icons.edit}
      submitIcon={icons.check}
      submitText={i18n.t("general.confirm")}
      canSubmit
      onSubmit={saveAliases}
      onCancel={onCancel}
      customCardAction={(
        <BaseButton edit iconSlot={<Icon path={icons.create} />} onClick={createAlias}>
          {i18n.t("data-pages.create-alias")}
        </BaseButton>
      )}
    >
      <Box sx={{ p: 2 }}>
        {aliases.map((alias, i) => (
          <Grid key={i} container spacing={2} sx={{ alignItems: "center" }}>
            <Grid size={10}>
              <TextInput
                value={alias.name}
                onChange={name => setAliases(prev => prev.map((a, j) => (j === i ? { ...a, name } : a)))}
                label={i18n.t("general.name")}
                rules={[validators.required]}
              />
            </Grid>
            <Grid size={2}>
              <BaseButtonGroup
                buttons={[{ icon: icons.delete, text: i18n.t("general.delete"), event: "delete" }]}
                onEvent={() => deleteAlias(i)}
              />
            </Grid>
          </Grid>
        ))}
      </Box>
    </BaseDialog>
  );
}

export default RecipeDataAliasManagerDialog;
