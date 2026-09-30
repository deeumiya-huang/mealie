import { useEffect, useState } from "react";
import CardContent from "@mui/material/CardContent";
import { icons } from "~/lib/icons";
import { Organizer } from "~/lib/api/types/non-generated";
import type { RecipeOrganizer } from "~/lib/api/types/non-generated";
import type { RecipeCategory, RecipeTag, RecipeTool } from "~/lib/api/types/recipe";
import { useCategoryStore, useTagStore, useToolStore } from "~/hooks/store";
import { useI18n } from "~/hooks/use-global-i18n";
import { BaseDialog } from "~/components/global/BaseDialog";
import { CheckboxInput, TextInput, VForm } from "~/components/global/form";

export interface RecipeOrganizerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemType?: RecipeOrganizer;
  onCreatedItem?: (item: RecipeCategory | RecipeTag | RecipeTool) => void;
}

export function RecipeOrganizerDialog({ open, onOpenChange, itemType = "category" as RecipeOrganizer, onCreatedItem }: RecipeOrganizerDialogProps) {
  const i18n = useI18n();
  const [name, setName] = useState("");
  const [onHand, setOnHand] = useState(false);
  const tagStore = useTagStore();
  const toolStore = useToolStore();
  const categoryStore = useCategoryStore();
  const store = itemType === Organizer.Tag ? tagStore : itemType === Organizer.Tool ? toolStore : categoryStore;

  useEffect(() => {
    if (!open) setName("");
  }, [open]);

  const properties = itemType === Organizer.Tag
    ? { title: i18n.t("tag.create-a-tag"), label: i18n.t("tag.tag-name"), icon: icons.tags }
    : itemType === Organizer.Tool
      ? { title: i18n.t("tool.create-a-tool"), label: i18n.t("tool.tool-name"), icon: icons.potSteam }
      : { title: i18n.t("category.create-a-category"), label: i18n.t("category.category-name"), icon: icons.categories };

  const required = (val: string) => !!val || i18n.t("general.a-name-is-required");

  async function select() {
    // The same shape is used for every organizer type; tools also take `onHand`.
    const newItem = await store.actions.createOne({ name, onHand } as unknown as RecipeTool);
    if (newItem) onCreatedItem?.(newItem);
    onOpenChange(false);
  }

  return (
    <BaseDialog
      open={open}
      onOpenChange={onOpenChange}
      width="500"
      title={properties.title}
      icon={properties.icon}
      canSubmit
      submitDisabled={!name}
      onSubmit={() => void select()}
    >
      <VForm>
        <CardContent>
          <TextInput value={name} onChange={setName} label={properties.label} rules={[required]} autoFocus />
          {itemType === Organizer.Tool && <CheckboxInput checked={onHand} onChange={setOnHand} label={i18n.t("tool.on-hand")} />}
        </CardContent>
      </VForm>
    </BaseDialog>
  );
}

export default RecipeOrganizerDialog;
