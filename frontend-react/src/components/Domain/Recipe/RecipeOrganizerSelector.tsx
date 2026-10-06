// Usage: <RecipeOrganizerSelector selectorType={Organizer.Tag} value={tags} onChange={setTags} />
//   · without create dialog / label / icon, underlined: <… showAdd={false} showLabel={false} showIcon={false} variant="underlined" />
// Multi-select autocomplete with chips for categories, tags, tools, foods, labels, households or users, backed by the
// shared stores. With `showAdd`, Enter (no exact match) or the "create" button creates the typed name and a "+" button
// opens the RecipeOrganizerDialog. Vue `v-model` → `value` + `onChange`; `inputAttrs` is the subset of Vuetify field
// props the app passes (variant, density, rounded, hideDetails, clearable, class → className).
import { createContext, useContext, useEffect, useState, type KeyboardEvent } from "react";
import Autocomplete, { type AutocompleteRenderValueGetItemProps } from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Paper, { type PaperProps } from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import { BaseButton } from "@/components/global/BaseButton";
import { MdiIcon } from "@/components/global/MdiIcon";
import { RecipeOrganizerDialog } from "@/components/Domain/Recipe/RecipeOrganizerDialog";
import { useCategoryStore, useFoodStore, useHouseholdStore, useLabelStore, useTagStore, useToolStore } from "@/hooks/store";
import { useUserStore } from "@/hooks/store/use-user-store";
import { normalizeFilter } from "@/hooks/use-utils";
import { useI18n } from "@/i18n";
import { Organizer, type RecipeOrganizer } from "@/lib/api/types/non-generated";
import type { IngredientFood, RecipeCategory, RecipeTag, RecipeTool } from "@/lib/api/types/recipe";
import type { HouseholdSummary } from "@/lib/api/types/household";
import type { MultiPurposeLabelSummary } from "@/lib/api/types/labels";
import type { UserSummary } from "@/lib/api/types/user";
import { icons } from "@/lib/icons";

export type RecipeOrganizerItem
  = | HouseholdSummary
    | RecipeTag
    | RecipeCategory
    | RecipeTool
    | IngredientFood
    | UserSummary
    | MultiPurposeLabelSummary;

type OrganizerVariant = "filled" | "underlined" | "outlined" | "plain" | "solo" | "solo-inverted" | "solo-filled";

/** The Vuetify field props passed through `input-attrs` by the Vue pages. */
export interface OrganizerInputAttrs {
  variant?: OrganizerVariant;
  density?: "default" | "comfortable" | "compact";
  rounded?: boolean;
  hideDetails?: boolean;
  singleLine?: boolean;
  clearable?: boolean;
  className?: string;
}

export interface RecipeOrganizerSelectorProps<T extends RecipeOrganizerItem = RecipeOrganizerItem> {
  selectorType: RecipeOrganizer;
  value: T[] | undefined;
  onChange: (value: T[]) => void;
  inputAttrs?: OrganizerInputAttrs;
  showAdd?: boolean;
  showLabel?: boolean;
  showIcon?: boolean;
  variant?: OrganizerVariant;
}

interface SelectorViewProps extends RecipeOrganizerSelectorProps {
  items: RecipeOrganizerItem[];
  createOne?: (payload: { name: string }) => Promise<RecipeOrganizerItem | null>;
}

function itemName(item: RecipeOrganizerItem): string {
  return "name" in item ? item.name ?? "" : "";
}

function itemTitle(item: RecipeOrganizerItem, selectorType: RecipeOrganizer): string {
  if (selectorType === Organizer.User) {
    return ("fullName" in item ? item.fullName : undefined) ?? itemName(item);
  }
  return itemName(item);
}

function isSameItem(a: RecipeOrganizerItem, b: RecipeOrganizerItem): boolean {
  const idA = "id" in a ? a.id : undefined;
  const idB = "id" in b ? b.id : undefined;
  if (idA && idB) {
    return idA === idB;
  }
  return itemName(a) === itemName(b);
}

function muiVariant(variant: OrganizerVariant): "outlined" | "filled" | "standard" {
  switch (variant) {
    case "underlined":
    case "plain":
      return "standard";
    case "filled":
    case "solo-filled":
    case "solo-inverted":
      return "filled";
    default:
      return "outlined";
  }
}

// The autocomplete's dropdown gets the "create" button below the options (Vue `append-item` slot).
interface CreateFooter {
  show: boolean;
  onCreate: () => void;
}
const CreateFooterContext = createContext<CreateFooter>({ show: false, onCreate: () => undefined });

function OrganizerPaper({ children, ...props }: PaperProps) {
  const { show, onCreate } = useContext(CreateFooterContext);
  return (
    <Paper {...props}>
      {children}
      {show && (
        <Box sx={{ px: 1, pb: 1 }}>
          <BaseButton fullWidth small onClick={onCreate} />
        </Box>
      )}
    </Paper>
  );
}

function OrganizerSelectorView({
  selectorType,
  value,
  onChange,
  inputAttrs = {},
  showAdd = true,
  showLabel = true,
  showIcon = true,
  variant = "outlined",
  items,
  createOne,
}: SelectorViewProps) {
  const { t } = useI18n();
  const [dialog, setDialog] = useState(false);
  const [searchInput, setSearchInput] = useState("");

  const selected = value ?? [];

  useEffect(() => {
    if (value === undefined) {
      onChange([]);
    }
    // only on mount, like Vue's onMounted
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const label = (() => {
    if (!showLabel) {
      return "";
    }

    switch (selectorType) {
      case Organizer.Tag:
        return t("tag.tags");
      case Organizer.Category:
        return t("category.categories");
      case Organizer.Tool:
        return t("tool.tools");
      case Organizer.Food:
        return t("general.foods");
      case Organizer.Label:
        return t("data-pages.foods.food-label");
      case Organizer.Household:
        return t("household.households");
      case Organizer.User:
        return t("user.users");
      default:
        return t("general.organizer");
    }
  })();

  const icon = (() => {
    if (!showIcon) {
      return "";
    }

    switch (selectorType) {
      case Organizer.Tag:
        return icons.tags;
      case Organizer.Category:
        return icons.categories;
      case Organizer.Tool:
        return icons.tools;
      case Organizer.Food:
        return icons.foods;
      case Organizer.Label:
        return icons.tags;
      case Organizer.Household:
        return icons.household;
      case Organizer.User:
        return icons.user;
      default:
        return icons.tags;
    }
  })();

  function appendCreated(item: RecipeOrganizerItem | null) {
    if (!item) {
      return;
    }
    onChange([...selected, item]);
  }

  async function createItem() {
    if (!searchInput || !createOne) {
      return;
    }

    const newItem = await createOne({ name: searchInput });
    if (newItem) {
      appendCreated(newItem);
    }
    setSearchInput("");
  }

  function handleEnter() {
    if (!searchInput) {
      return;
    }
    const exactMatch = items.some(item => itemName(item).toLowerCase() === searchInput.toLowerCase());
    if (!exactMatch) {
      void createItem();
    }
  }

  const fieldVariant = inputAttrs.variant ?? variant;
  const compact = inputAttrs.density === "compact";
  const footer: CreateFooter = { show: showAdd && !!searchInput, onCreate: () => void createItem() };

  return (
    <CreateFooterContext.Provider value={footer}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, m: 0, p: 0 }}>
        <Autocomplete<RecipeOrganizerItem, true, boolean, false>
          multiple
          autoHighlight
          disableClearable={!inputAttrs.clearable}
          sx={{ flex: 1, minWidth: 0, mt: "6px" }}
          className={inputAttrs.className}
          options={items}
          value={selected}
          inputValue={searchInput}
          getOptionLabel={option => itemTitle(option, selectorType)}
          isOptionEqualToValue={isSameItem}
          filterOptions={(options, { inputValue }) => options.filter(option => normalizeFilter(itemTitle(option, selectorType), inputValue))}
          noOptionsText={showAdd
            ? <Box sx={{ textAlign: "center", pb: 1 }}>{t("recipe.press-enter-to-create")}</Box>
            : t("search.no-results")}
          slots={{ paper: OrganizerPaper }}
          onInputChange={(_event, text, reason) => {
            // the input is cleared whenever the selection changes (Vue resetSearchInput)
            if (reason === "input" || reason === "clear") {
              setSearchInput(text);
            }
          }}
          onChange={(_event, next) => {
            setSearchInput("");
            onChange(next);
          }}
          renderValue={(chips: RecipeOrganizerItem[], getItemProps: AutocompleteRenderValueGetItemProps<true>) => chips.map((item, index) => {
            const { key, ...itemProps } = getItemProps({ index });
            return (
              <Chip
                key={key}
                {...itemProps}
                color="accent"
                variant="filled"
                label={itemTitle(item, selectorType)}
                sx={{ m: 0.5, borderRadius: 1 }}
              />
            );
          })}
          renderOption={({ key, ...props }, option) => (
            <li key={key} {...props}>{itemTitle(option, selectorType)}</li>
          )}
          renderInput={params => (
            <TextField
              {...params}
              label={label}
              variant={muiVariant(fieldVariant)}
              size={compact ? "small" : "medium"}
              onKeyUp={(event: KeyboardEvent) => {
                if (event.key === "Enter") {
                  handleEnter();
                }
              }}
              slotProps={{
                ...params.slotProps,
                input: {
                  ...params.slotProps.input,
                  sx: inputAttrs.rounded ? { borderRadius: 2 } : undefined,
                  startAdornment: (
                    <>
                      {icon && (
                        <InputAdornment position="start">
                          <MdiIcon path={icon} />
                        </InputAdornment>
                      )}
                      {params.slotProps.input.startAdornment}
                    </>
                  ),
                },
                inputLabel: { ...params.slotProps.inputLabel, shrink: label ? undefined : false },
              }}
            />
          )}
        />
        {showAdd && (
          <>
            <IconButton onClick={() => setDialog(true)}>
              <MdiIcon path={icons.create} />
            </IconButton>
            <RecipeOrganizerDialog
              open={dialog}
              onOpenChange={setDialog}
              itemType={selectorType}
              onCreatedItem={appendCreated}
            />
          </>
        )}
      </Box>
    </CreateFooterContext.Provider>
  );
}

// The shared stores load their data when first used, so only the store of the selected type is mounted.
// Their create payloads need different fields per type; the API only needs the name.
function CategorySelector(props: RecipeOrganizerSelectorProps) {
  const { store, actions } = useCategoryStore();
  return <OrganizerSelectorView {...props} items={store} createOne={payload => actions.createOne(payload as unknown as RecipeCategory)} />;
}

function TagSelector(props: RecipeOrganizerSelectorProps) {
  const { store, actions } = useTagStore();
  return <OrganizerSelectorView {...props} items={store} createOne={payload => actions.createOne(payload as unknown as RecipeTag)} />;
}

function ToolSelector(props: RecipeOrganizerSelectorProps) {
  const { store, actions } = useToolStore();
  return <OrganizerSelectorView {...props} items={store} createOne={payload => actions.createOne(payload as unknown as RecipeTool)} />;
}

function FoodSelector(props: RecipeOrganizerSelectorProps) {
  const { store, actions } = useFoodStore();
  return <OrganizerSelectorView {...props} items={store} createOne={payload => actions.createOne(payload as unknown as IngredientFood)} />;
}

function LabelSelector(props: RecipeOrganizerSelectorProps) {
  const { store, actions } = useLabelStore();
  return <OrganizerSelectorView {...props} items={store} createOne={payload => actions.createOne(payload as unknown as MultiPurposeLabelSummary)} />;
}

function HouseholdSelector(props: RecipeOrganizerSelectorProps) {
  const { store } = useHouseholdStore();
  return <OrganizerSelectorView {...props} items={store} />;
}

function UserSelector(props: RecipeOrganizerSelectorProps) {
  const { store } = useUserStore();
  return <OrganizerSelectorView {...props} items={store} />;
}

export function RecipeOrganizerSelector<T extends RecipeOrganizerItem = RecipeOrganizerItem>(props: RecipeOrganizerSelectorProps<T>) {
  // the item type only narrows the caller's `value`/`onChange`; the stores hold the union
  const common = props as unknown as RecipeOrganizerSelectorProps;
  switch (props.selectorType) {
    case Organizer.Tag:
      return <TagSelector {...common} />;
    case Organizer.Tool:
      return <ToolSelector {...common} />;
    case Organizer.Food:
      return <FoodSelector {...common} />;
    case Organizer.Label:
      return <LabelSelector {...common} />;
    case Organizer.Household:
      return <HouseholdSelector {...common} />;
    case Organizer.User:
      return <UserSelector {...common} />;
    default:
      return <CategorySelector {...common} />;
  }
}
