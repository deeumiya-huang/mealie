// Usage: <RecipeIngredientEditor value={ingredient} onChange={ing => …} enableDragHandle enableContextMenu
//   onDelete={…} onInsertAbove={…} onInsertBelow={…} beforeDivider={<p>…</p>} />
// One editable ingredient row: quantity, unit and food (or a linked recipe) autocompletes that can create a missing
// unit/food, the note, optional section title and substitutions, and a delete button + menu. (Vue `v-model` → `value`
// + `onChange`; the `before-divider` slot → `beforeDivider`.)
import { createContext, useContext, useState, type KeyboardEvent, type ReactNode } from "react";
import { useParams } from "react-router";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import InputAdornment from "@mui/material/InputAdornment";
import Paper, { type PaperProps } from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import { BaseButton } from "@/components/global/BaseButton";
import { BaseButtonGroup } from "@/components/global/BaseButtonGroup";
import { BaseNumberInput } from "@/components/global/BaseNumberInput";
import { MdiIcon } from "@/components/global/MdiIcon";
import { RecipeIngredientSubstitutionEditor, type EditableSubstitution } from "@/components/Domain/Recipe/RecipeIngredientSubstitutionEditor";
import { usePublicExploreApi, useUserApi } from "@/hooks/api";
import { useRecipeSearch } from "@/hooks/recipes/use-recipe-search";
import { useFoodData, useFoodStore, useUnitData, useUnitStore } from "@/hooks/store";
import { useLoggedInState } from "@/hooks/use-logged-in-state";
import { useMealieAuth } from "@/hooks/use-mealie-auth";
import { useSearch } from "@/hooks/use-search";
import { useDisplay } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import type { CreateIngredientFood, CreateIngredientUnit, IngredientFood, IngredientUnit, Recipe, RecipeIngredient } from "@/lib/api/types/recipe";
import { icons } from "@/lib/icons";
import { RecipeIngredientEditorLayout } from "./RecipeIngredientEditorLayout";

interface RecipeIngredientEditorProps {
  value: RecipeIngredient;
  onChange: (value: RecipeIngredient) => void;
  menuAttachTarget?: string;
  isRecipe?: boolean;
  unitError?: boolean;
  unitErrorTooltip?: string;
  foodError?: boolean;
  foodErrorTooltip?: string;
  enableContextMenu?: boolean;
  enableDragHandle?: boolean;
  deleteDisabled?: boolean;
  className?: string;
  /** Vue `#before-divider` slot. */
  beforeDivider?: ReactNode;
  onClickIngredientField?: (field: string) => void;
  onInsertAbove?: () => void;
  onInsertBelow?: () => void;
  onDelete?: () => void;
}

// The unit/food dropdown gets the "create" button below the options (Vue `append-item` slot).
interface CreateFooter {
  show: boolean;
  onCreate: () => void;
}
const CreateFooterContext = createContext<CreateFooter>({ show: false, onCreate: () => undefined });

function CreatePaper({ children, ...props }: PaperProps) {
  const { show, onCreate } = useContext(CreateFooterContext);
  return (
    <Paper {...props}>
      {children}
      {show && (
        // keep the focus in the field while the button is pressed, so the dropdown stays open for the click
        <Box sx={{ px: 1, pb: 1 }} onMouseDown={event => event.preventDefault()}>
          <BaseButton fullWidth small onClick={onCreate} />
        </Box>
      )}
    </Paper>
  );
}

type NamedItem = IngredientUnit | CreateIngredientUnit | IngredientFood | CreateIngredientFood;

interface ItemAutocompleteProps<T extends NamedItem> {
  value: T | null | undefined;
  options: T[];
  search: string;
  onSearchChange: (search: string) => void;
  onChange: (value: T | null) => void;
  placeholder: string;
  error: boolean;
  errorTooltip: string;
  showCreate: boolean;
  onCreate: () => void;
  onEnter: () => void;
  flex?: string;
}

/** `<v-autocomplete return-object auto-select-first clearable item-title="name">` for a unit or a food. */
function ItemAutocomplete<T extends NamedItem>({
  value,
  options,
  search,
  onSearchChange,
  onChange,
  placeholder,
  error,
  errorTooltip,
  showCreate,
  onCreate,
  onEnter,
  flex,
}: ItemAutocompleteProps<T>) {
  const { t } = useI18n();

  return (
    <CreateFooterContext.Provider value={{ show: showCreate, onCreate }}>
      <Autocomplete<T, false, false, false>
        autoHighlight
        size="small"
        sx={{ flex }}
        options={options}
        value={value ?? null}
        inputValue={search}
        getOptionLabel={option => option.name ?? ""}
        isOptionEqualToValue={(option, selected) => (option.id ? option.id === selected.id : option.name === selected.name)}
        // the options are already filtered by useSearch (Vue `:custom-filter="() => true"`)
        filterOptions={items => items}
        noOptionsText={<Box sx={{ textAlign: "center", pb: 1 }}>{t("recipe.press-enter-to-create")}</Box>}
        slots={{ paper: CreatePaper }}
        slotProps={{ listbox: { sx: { maxHeight: "250px" } } }}
        onInputChange={(_event, text) => onSearchChange(text)}
        onChange={(_event, next) => onChange(next)}
        renderOption={({ key, ...props }, option) => (
          <li key={key} {...props}>{option.name}</li>
        )}
        renderInput={params => (
          <TextField
            {...params}
            variant="filled"
            placeholder={placeholder}
            hiddenLabel
            onKeyUp={(event: KeyboardEvent) => {
              if (event.key === "Enter") {
                onEnter();
              }
            }}
            slotProps={{
              ...params.slotProps,
              input: {
                ...params.slotProps.input,
                startAdornment: error
                  ? (
                      <InputAdornment position="start">
                        <Tooltip title={errorTooltip} placement="bottom">
                          <span>
                            <MdiIcon path={icons.alert} sx={{ color: "primary.main", opacity: 1 }} />
                          </span>
                        </Tooltip>
                      </InputAdornment>
                    )
                  : params.slotProps.input.startAdornment,
              },
            }}
          />
        )}
      />
    </CreateFooterContext.Provider>
  );
}

export function RecipeIngredientEditor({
  value: model,
  onChange,
  menuAttachTarget = "body",
  isRecipe = false,
  unitError = false,
  unitErrorTooltip = "",
  foodError = false,
  foodErrorTooltip = "",
  enableContextMenu = false,
  enableDragHandle = false,
  deleteDisabled = false,
  className,
  beforeDivider,
  onClickIngredientField,
  onInsertAbove,
  onInsertBelow,
  onDelete,
}: RecipeIngredientEditorProps) {
  const { t } = useI18n();
  const { mdAndDown } = useDisplay();

  const [showTitle, setShowTitle] = useState(false);
  const [showSubstitutions, setShowSubstitutions] = useState(false);
  const [stateIsRecipe, setStateIsRecipe] = useState(isRecipe);

  const update = (patch: Partial<RecipeIngredient>) => onChange({ ...model, ...patch });

  // an ingredient that arrives with a title or substitutions shows them without being toggled on,
  // so what the menu entries act on is this, not the flag on its own -- otherwise the first press
  // is a no-op and the second one is the destructive half of a toggle nobody saw move
  const titleVisible = !!model.title || showTitle;
  const substitutionsVisible = !!model.substitutions?.length || showSubstitutions;

  // these entries clear what they hide, so they name the action instead of saying "toggle"
  const contextMenuOptions = [
    {
      text: titleVisible
        ? t("recipe.clear-section")
        : t("recipe.add-section"),
      event: "toggle-section",
    },
    {
      text: t("recipe.toggle-recipe"),
      event: "toggle-subrecipe",
    },
    {
      text: substitutionsVisible
        ? t("recipe.clear-substitutions")
        : t("recipe.add-substitutions"),
      event: "toggle-substitutions",
    },
    {
      text: t("recipe.insert-above"),
      event: "insert-above",
    },
    {
      text: t("recipe.insert-below"),
      event: "insert-below",
    },
  ];

  const btns = [
    {
      icon: icons.delete,
      text: t("general.delete"),
      event: "delete",
      children: undefined,
      disabled: deleteDisabled,
    },
    {
      icon: icons.dotsVertical,
      text: t("general.menu"),
      event: "open",
      children: contextMenuOptions,
    },
  ];

  // Foods
  const foodStore = useFoodStore();
  const foodData = useFoodData();
  const { search: foodSearch, setSearch: setFoodSearch, filtered: filteredFoods } = useSearch(foodStore.store);

  // the substitution pickers offer every food; unlike the main field they can't create one,
  // since a substitute the user has to invent is what the note is for
  const allFoods = foodStore.store;

  const showCreateFood = !!foodSearch
    && !filteredFoods.some(f => (f.name ?? "").toLowerCase() === foodSearch.toLowerCase());

  async function createAssignFood() {
    const created = await foodStore.actions.createOne({ ...foodData.data, name: foodSearch });
    update({ food: created || undefined });
    foodData.reset();
    blurActive();
  }

  // Recipes
  const params = useParams();
  const auth = useMealieAuth();
  const groupSlug = params.groupSlug || auth.user?.groupSlug || "";

  const { isOwnGroup } = useLoggedInState();
  const userApi = useUserApi();
  const exploreApi = usePublicExploreApi(groupSlug).explore;
  const search = useRecipeSearch(isOwnGroup ? userApi : exploreApi);

  // Units
  const unitStore = useUnitStore();
  const unitsData = useUnitData();
  const { search: unitSearch, setSearch: setUnitSearch, filtered: filteredUnits } = useSearch(unitStore.store);

  const showCreateUnit = !!unitSearch
    && !filteredUnits.some(u => (u.name ?? "").toLowerCase() === unitSearch.toLowerCase());

  async function createAssignUnit() {
    const created = await unitStore.actions.createOne({ ...unitsData.data, name: unitSearch });
    update({ unit: created || undefined });
    unitsData.reset();
    blurActive();
  }

  function blurActive() {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }

  function toggleTitle() {
    if (titleVisible) {
      update({ title: "" });
      setShowTitle(false);
    }
    else {
      setShowTitle(true);
    }
  }

  function addSubstitution() {
    update({ substitutions: [...(model.substitutions || []), { substituteFoodId: null, note: "" }] });
    setShowSubstitutions(true);
  }

  function deleteSubstitution(index: number) {
    update({ substitutions: (model.substitutions || []).filter((_, i) => i !== index) });
    // removing the last row leaves the section open; the user is still working in it
    setShowSubstitutions(true);
  }

  function changeSubstitution(index: number, patch: Partial<EditableSubstitution>) {
    update({
      substitutions: (model.substitutions || []).map((substitution, i) => (i === index ? { ...substitution, ...patch } : substitution)),
    });
  }

  function toggleSubstitutions() {
    if (substitutionsVisible) {
      update({ substitutions: [] });
      setShowSubstitutions(false);
    }
    else {
      addSubstitution();
    }
  }

  function toggleIsRecipe() {
    if (stateIsRecipe) {
      update({ referencedRecipe: undefined });
    }
    else {
      update({ unit: undefined, food: undefined });
    }
    setStateIsRecipe(!stateIsRecipe);
  }

  function handleUnitEnter() {
    if (
      model.unit === undefined
      || model.unit === null
      || !model.unit.name.includes(unitSearch)
    ) {
      void createAssignUnit();
    }
  }

  function handleFoodEnter() {
    if (
      model.food === undefined
      || model.food === null
      || !model.food.name.includes(foodSearch)
    ) {
      void createAssignFood();
    }
  }

  function quantityFilter(e: KeyboardEvent) {
    if (e.key === "-" || e.key === "+" || e.key === "e") {
      e.preventDefault();
    }
  }

  function onMenuAction(event: string) {
    switch (event) {
      case "toggle-section":
        toggleTitle();
        break;
      case "toggle-subrecipe":
        toggleIsRecipe();
        break;
      case "toggle-substitutions":
        toggleSubstitutions();
        break;
      case "insert-above":
        onInsertAbove?.();
        break;
      case "insert-below":
        onInsertBelow?.();
        break;
      case "delete":
        onDelete?.();
        break;
    }
  }

  const flex = (grow: string) => (mdAndDown ? undefined : grow);

  const form = (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ display: "flex", gap: 1, py: 1, flexDirection: mdAndDown ? "column" : "row" }}>
        <Box sx={{ flex: flex("3 0 50px") }}>
          <BaseNumberInput
            value={model.quantity}
            onChange={quantity => update({ quantity })}
            variant="filled"
            precision={null}
            min={0}
            hideDetails
            inset
            density="compact"
            fullWidth
            hiddenLabel
            placeholder={t("recipe.quantity")}
            onKeyDown={quantityFilter}
          />
        </Box>
        <ItemAutocomplete<IngredientUnit | CreateIngredientUnit>
          value={model.unit}
          options={filteredUnits}
          search={unitSearch}
          onSearchChange={setUnitSearch}
          onChange={unit => update({ unit: unit ?? undefined })}
          placeholder={t("recipe.choose-unit")}
          error={unitError}
          errorTooltip={unitErrorTooltip}
          showCreate={showCreateUnit}
          onCreate={() => void createAssignUnit()}
          onEnter={handleUnitEnter}
          flex={flex("4 0 50px")}
        />

        {/* Foods Input */}
        {!stateIsRecipe && (
          <ItemAutocomplete<IngredientFood | CreateIngredientFood>
            value={model.food}
            options={filteredFoods}
            search={foodSearch}
            onSearchChange={setFoodSearch}
            onChange={food => update({ food: food ?? undefined })}
            placeholder={t("recipe.choose-food")}
            error={foodError}
            errorTooltip={foodErrorTooltip}
            showCreate={showCreateFood}
            onCreate={() => void createAssignFood()}
            onEnter={handleFoodEnter}
            flex={flex("7 0 50px")}
          />
        )}
        {/* Recipe Input */}
        {stateIsRecipe && (
          <Autocomplete<Recipe, false, false, false>
            autoHighlight
            size="small"
            sx={{ flex: flex("7 0 50px") }}
            options={search.data || []}
            value={model.referencedRecipe ?? null}
            inputValue={search.query}
            getOptionLabel={option => option.name ?? ""}
            isOptionEqualToValue={(option, selected) => option.id === selected.id}
            filterOptions={items => items}
            onInputChange={(_event, text) => search.setQuery(text)}
            onChange={(_event, next) => update({ referencedRecipe: next ?? undefined })}
            onOpen={() => void search.trigger()}
            renderOption={({ key, ...props }, option) => (
              <li key={key} {...props}>{option.name}</li>
            )}
            renderInput={params => (
              <TextField
                {...params}
                variant="filled"
                placeholder={t("search.type-to-search")}
                label={!model.referencedRecipe ? t("recipe.choose-recipe") : ""}
                onFocus={() => void search.trigger()}
              />
            )}
          />
        )}
        <TextField
          value={model.note ?? ""}
          onChange={event => update({ note: event.target.value })}
          variant="filled"
          size="small"
          hiddenLabel
          sx={{ flex: flex("7 0 50px") }}
          placeholder={t("recipe.notes")}
          onClick={() => onClickIngredientField?.("note")}
        />
      </Box>
    </Box>
  );

  return (
    <div className={className}>
      {titleVisible && (
        <TextField
          value={model.title ?? ""}
          onChange={event => update({ title: event.target.value })}
          variant="standard"
          size="small"
          sx={{ mx: 0.5, mt: 1.5, mb: 2, maxWidth: 500, width: "100%" }}
          placeholder={t("recipe.section-title")}
          onClick={() => onClickIngredientField?.("title")}
        />
      )}
      <RecipeIngredientEditorLayout
        header={enableDragHandle || enableContextMenu}
        dragHandle={enableDragHandle
          ? <MdiIcon path={icons.arrowUpDown} size="large" className="handle" sx={{ m: 1, cursor: "grab" }} />
          : undefined}
        contextMenu={enableContextMenu
          ? (
              <Box sx={{ ml: "auto" }}>
                <BaseButtonGroup large={false} buttons={btns} onAction={onMenuAction} />
              </Box>
            )
          : undefined}
        form={form}
      />
      <Box sx={{ px: 1, ml: mdAndDown ? undefined : 5 }}>
        {/* shown whenever the ingredient carries substitutions, so the toggle can't hide saved data */}
        {substitutionsVisible && (
          <Box sx={{ py: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", typography: "caption", mb: 0.5 }}>
              <MdiIcon path={icons.swapHorizontal} size="small" sx={{ mr: 0.5 }} />
              {t("recipe.substitutions")}
            </Box>
            <RecipeIngredientSubstitutionEditor
              substitutions={model.substitutions || []}
              foods={allFoods}
              menuAttachTarget={menuAttachTarget}
              onAdd={addSubstitution}
              onDelete={deleteSubstitution}
              onChange={changeSubstitution}
            />
          </Box>
        )}
        {beforeDivider}
      </Box>
    </div>
  );
}

