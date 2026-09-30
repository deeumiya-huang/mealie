import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import { icons } from "~/lib/icons";
import { Organizer } from "~/lib/api/types/non-generated";
import type { RecipeOrganizer } from "~/lib/api/types/non-generated";
import { useCategoryStore, useFoodStore, useHouseholdStore, useLabelStore, useTagStore, useToolStore } from "~/hooks/store";
import { useUserStore } from "~/hooks/store/use-user-store";
import { useI18n } from "~/hooks/use-global-i18n";
import { normalizeFilter } from "~/hooks/use-utils";
import { BaseButton } from "~/components/global/BaseButton";
import { Icon } from "~/components/global/Icon";
import { AutocompleteInput } from "~/components/global/form";
import type { AutocompleteInputProps } from "~/components/global/form";
import { RecipeOrganizerDialog } from "./RecipeOrganizerDialog";

/** Anything the organizer selector can hold: every store item has an id and a name or fullName. */
export interface OrganizerItem {
  id?: string | null;
  name?: string;
  fullName?: string | null;
}

export interface RecipeOrganizerSelectorProps<T extends OrganizerItem> {
  selectorType: RecipeOrganizer;
  value: T[] | undefined;
  onChange: (value: T[]) => void;
  inputAttrs?: Partial<AutocompleteInputProps<T>>;
  showAdd?: boolean;
  showLabel?: boolean;
  showIcon?: boolean;
  variant?: "filled" | "underlined" | "outlined" | "plain" | "solo" | "solo-filled";
}

export function RecipeOrganizerSelector<T extends OrganizerItem>(props: RecipeOrganizerSelectorProps<T>) {
  const { selectorType, value, onChange, inputAttrs = {}, showAdd = true, showLabel = true, showIcon = true, variant = "outlined" } = props;
  const i18n = useI18n();
  const [dialog, setDialog] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const selected = value ?? [];

  useEffect(() => {
    if (value === undefined) onChange([]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- onMounted
  }, []);

  const labels: Record<string, string> = {
    [Organizer.Tag]: i18n.t("tag.tags"),
    [Organizer.Category]: i18n.t("category.categories"),
    [Organizer.Tool]: i18n.t("tool.tools"),
    [Organizer.Food]: i18n.t("general.foods"),
    [Organizer.Label]: i18n.t("data-pages.foods.food-label"),
    [Organizer.Household]: i18n.t("household.households"),
    [Organizer.User]: i18n.t("user.users"),
  };
  const iconMap: Record<string, string> = {
    [Organizer.Tag]: icons.tags,
    [Organizer.Category]: icons.categories,
    [Organizer.Tool]: icons.tools,
    [Organizer.Food]: icons.foods,
    [Organizer.Label]: icons.tags,
    [Organizer.Household]: icons.household,
    [Organizer.User]: icons.user,
  };
  const label = showLabel ? (labels[selectorType] ?? i18n.t("general.organizer")) : undefined;
  const icon = showIcon ? (iconMap[selectorType] ?? icons.tags) : undefined;
  const titleOf = (i: OrganizerItem) => (selectorType === Organizer.User ? (i?.fullName ?? i?.name ?? "") : (i?.name ?? ""));

  const storeMap = {
    [Organizer.Category]: useCategoryStore(),
    [Organizer.Tag]: useTagStore(),
    [Organizer.Tool]: useToolStore(),
    [Organizer.Food]: useFoodStore(),
    [Organizer.Label]: useLabelStore(),
    [Organizer.Household]: useHouseholdStore(),
    [Organizer.User]: useUserStore(),
  };
  const active = storeMap[selectorType as keyof typeof storeMap];
  const items = (active?.store ?? []) as unknown as T[];

  function appendCreated(item: OrganizerItem) {
    onChange([...selected, item as T]);
  }

  async function createItem() {
    if (!searchInput) return;
    const actions = active?.actions as { createOne?: (data: { name: string }) => Promise<OrganizerItem | null> } | undefined;
    const newItem = await actions?.createOne?.({ name: searchInput });
    if (newItem) appendCreated(newItem);
    setSearchInput("");
  }

  function handleEnter() {
    if (!searchInput) return;
    const exactMatch = items.some(item => (item.name ?? "").toLowerCase() === searchInput.toLowerCase());
    if (!exactMatch) void createItem();
  }

  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", mt: "6px" }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <AutocompleteInput<T>
          {...inputAttrs}
          value={selected}
          onChange={(v: T[]) => {
            onChange(v);
            setSearchInput("");
          }}
          search={searchInput}
          onSearchChange={setSearchInput}
          items={items}
          customFilter={(title, query) => normalizeFilter(title, query)}
          label={label}
          multiple
          chips
          closableChips
          itemTitle={item => titleOf(item)}
          itemValue={item => item.id ?? titleOf(item)}
          variant={variant}
          prependInnerIcon={icon}
          returnObject
          autoSelectFirst
          noDataText={showAdd ? i18n.t("recipe.press-enter-to-create") : undefined}
          renderChip={(item, onDelete) => (
            <Chip sx={{ m: 0.5, borderRadius: 1 }} color="accent" size="small" label={titleOf(item)} onDelete={onDelete} />
          )}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleEnter();
          }}
        />
        {showAdd && searchInput && (
          <Box sx={{ px: 1 }}>
            <BaseButton fullWidth small onClick={() => void createItem()} />
          </Box>
        )}
      </Box>
      {showAdd && (
        <>
          <IconButton sx={{ mt: 0.5 }} onClick={() => setDialog(true)}>
            <Icon path={icons.create} />
          </IconButton>
          <RecipeOrganizerDialog open={dialog} onOpenChange={setDialog} itemType={selectorType} onCreatedItem={appendCreated} />
        </>
      )}
    </Box>
  );
}

export default RecipeOrganizerSelector;
