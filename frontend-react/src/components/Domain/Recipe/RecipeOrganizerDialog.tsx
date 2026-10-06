// Usage: <RecipeOrganizerDialog open={open} onOpenChange={setOpen} itemType={Organizer.Tag}
//          onCreatedItem={item => …} /> — dialog that creates a category, tag or tool (tools also get "on hand").
// Vue `v-model` → `open` + `onOpenChange`, `@created-item` → `onCreatedItem`. `color` and `tagDialog` are
// accepted for parity (the Vue component ignored them).
import { useState } from "react";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import CardContent from "@mui/material/CardContent";
import FormControlLabel from "@mui/material/FormControlLabel";
import TextField from "@mui/material/TextField";
import { BaseDialog } from "@/components/global/BaseDialog";
import { useCategoryStore, useTagStore, useToolStore } from "@/hooks/store";
import { field, useFormValidation } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import { icons } from "@/lib/icons";
import { Organizer, type RecipeOrganizer } from "@/lib/api/types/non-generated";
import type { RecipeCategory, RecipeTag, RecipeTool } from "@/lib/api/types/recipe";

type CreatedOrganizer = RecipeCategory | RecipeTag | RecipeTool;

interface RecipeOrganizerDialogProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  color?: string | null;
  tagDialog?: boolean;
  itemType?: RecipeOrganizer;
  onCreatedItem?: (item: CreatedOrganizer | null) => void;
}

type CreateOne = (payload: { name: string; onHand: boolean }) => Promise<CreatedOrganizer | null>;

interface OrganizerDialogFormProps extends RecipeOrganizerDialogProps {
  createOne: CreateOne;
}

function OrganizerDialogForm({ open, onOpenChange, itemType = Organizer.Category, onCreatedItem, createOne }: OrganizerDialogFormProps) {
  const { t } = useI18n();

  const [name, setName] = useState("");
  const [onHand, setOnHand] = useState(false);

  // the name is cleared whenever the dialog closes
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) setName("");
  }

  const form = useFormValidation({
    name: field(name, [(val: string) => !!val || t("general.a-name-is-required")]),
  });

  const properties = (() => {
    switch (itemType) {
      case Organizer.Tag:
        return { title: t("tag.create-a-tag"), label: t("tag.tag-name"), icon: icons.tags };
      case Organizer.Tool:
        return { title: t("tool.create-a-tool"), label: t("tool.tool-name"), icon: icons.potSteam };
      default:
        return { title: t("category.create-a-category"), label: t("category.category-name"), icon: icons.categories };
    }
  })();

  async function select() {
    const newItem = await createOne({ name, onHand });
    onCreatedItem?.(newItem);
    onOpenChange?.(false);
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
      <Box component="form" noValidate onSubmit={event => event.preventDefault()}>
        <CardContent>
          <TextField
            fullWidth
            autoFocus
            margin="dense"
            variant="filled"
            label={properties.label}
            value={name}
            {...form.fieldProps("name")}
            onChange={event => setName(event.target.value)}
          />
          {itemType === Organizer.Tool && (
            <FormControlLabel
              label={t("tool.on-hand")}
              control={<Checkbox checked={onHand} onChange={event => setOnHand(event.target.checked)} />}
            />
          )}
        </CardContent>
      </Box>
    </BaseDialog>
  );
}

// The shared stores have different required fields per organizer type; the API only needs these.
function CategoryDialog(props: RecipeOrganizerDialogProps) {
  const { actions } = useCategoryStore();
  return <OrganizerDialogForm {...props} createOne={payload => actions.createOne(payload as unknown as RecipeCategory)} />;
}

function TagDialog(props: RecipeOrganizerDialogProps) {
  const { actions } = useTagStore();
  return <OrganizerDialogForm {...props} createOne={payload => actions.createOne(payload as unknown as RecipeTag)} />;
}

function ToolDialog(props: RecipeOrganizerDialogProps) {
  const { actions } = useToolStore();
  return <OrganizerDialogForm {...props} createOne={payload => actions.createOne(payload as unknown as RecipeTool)} />;
}

export function RecipeOrganizerDialog({ itemType = Organizer.Category, ...props }: RecipeOrganizerDialogProps) {
  switch (itemType) {
    case Organizer.Tag:
      return <TagDialog {...props} itemType={itemType} />;
    case Organizer.Tool:
      return <ToolDialog {...props} itemType={itemType} />;
    default:
      return <CategoryDialog {...props} itemType={itemType} />;
  }
}
