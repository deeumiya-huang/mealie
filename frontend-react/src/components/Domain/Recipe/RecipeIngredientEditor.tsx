import { useRef, useState } from "react";
import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import InputAdornment from "@mui/material/InputAdornment";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useParams } from "react-router";
import { icons } from "~/lib/icons";
import type { IngredientFood, IngredientUnit, Recipe, RecipeIngredient } from "~/lib/api/types/recipe";
import { useUserApi } from "~/hooks/api";
import { usePublicExploreApi } from "~/hooks/api/api-client";
import { useRecipeSearch } from "~/hooks/recipes/use-recipe-search";
import { useFoodData, useFoodStore, useUnitData, useUnitStore } from "~/hooks/store";
import { useDisplay } from "~/hooks/use-display";
import { useI18n } from "~/hooks/use-global-i18n";
import { useLoggedInState } from "~/hooks/use-logged-in-state";
import { useMealieAuth } from "~/hooks/use-mealie-auth";
import { useSearch } from "~/hooks/use-search";
import { BaseButton } from "~/components/global/BaseButton";
import { BaseButtonGroup } from "~/components/global/BaseButtonGroup";
import type { ButtonOption } from "~/components/global/BaseMenu";
import { Icon } from "~/components/global/Icon";
import { AutocompleteInput, NumberInput, TextInput } from "~/components/global/form";
import type { SortableHandleProps } from "~/components/global/SortableList";
import { RecipeIngredientSubstitutionEditor } from "./RecipeIngredientSubstitutionEditor";

export interface RecipeIngredientEditorProps {
  value: RecipeIngredient;
  onChange: (value: RecipeIngredient) => void;
  isRecipe?: boolean;
  unitError?: boolean;
  unitErrorTooltip?: string;
  foodError?: boolean;
  foodErrorTooltip?: string;
  enableContextMenu?: boolean;
  enableDragHandle?: boolean;
  /** Drag handle bindings from the surrounding SortableList. */
  dragHandle?: SortableHandleProps;
  deleteDisabled?: boolean;
  onClickIngredientField?: (field: string) => void;
  onInsertAbove?: () => void;
  onInsertBelow?: () => void;
  onDelete?: () => void;
  /** Content under the editor (the Vue `#before-divider` slot). */
  beforeDivider?: ReactNode;
}

function ErrorAdornment({ error, tooltip }: { error: boolean; tooltip: string }) {
  if (!error) return null;
  return (
    <InputAdornment position="start">
      <Tooltip title={tooltip} placement="bottom">
        <span><Icon path={icons.alert} color="primary" /></span>
      </Tooltip>
    </InputAdornment>
  );
}

export function RecipeIngredientEditor(props: RecipeIngredientEditorProps) {
  const {
    value: model, onChange, isRecipe = false, unitError = false, unitErrorTooltip = "", foodError = false, foodErrorTooltip = "",
    enableContextMenu = false, enableDragHandle = false, dragHandle, deleteDisabled = false, onClickIngredientField, onInsertAbove,
    onInsertBelow, onDelete, beforeDivider,
  } = props;
  const i18n = useI18n();
  const display = useDisplay();
  const [showTitle, setShowTitle] = useState(false);
  const [showSubstitutions, setShowSubstitutions] = useState(false);
  const [isRecipeState, setIsRecipe] = useState(isRecipe);
  const latest = useRef(model);
  latest.current = model;
  const update = (patch: Partial<RecipeIngredient>) => onChange({ ...latest.current, ...patch });

  // an ingredient that arrives with a title or substitutions shows them without being toggled on
  const titleVisible = !!model.title || showTitle;
  const substitutionsVisible = !!model.substitutions?.length || showSubstitutions;

  // these entries clear what they hide, so they name the action instead of saying "toggle"
  const contextMenuOptions: ButtonOption[] = [
    { text: titleVisible ? i18n.t("recipe.clear-section") : i18n.t("recipe.add-section"), event: "toggle-section" },
    { text: i18n.t("recipe.toggle-recipe"), event: "toggle-subrecipe" },
    { text: substitutionsVisible ? i18n.t("recipe.clear-substitutions") : i18n.t("recipe.add-substitutions"), event: "toggle-substitutions" },
    { text: i18n.t("recipe.insert-above"), event: "insert-above" },
    { text: i18n.t("recipe.insert-below"), event: "insert-below" },
  ];
  const btns: ButtonOption[] = [
    { icon: icons.delete, text: i18n.t("general.delete"), event: "delete", disabled: deleteDisabled },
    { icon: icons.dotsVertical, text: i18n.t("general.menu"), event: "open", children: contextMenuOptions },
  ];

  // Foods
  const foodStore = useFoodStore();
  const foodData = useFoodData();
  const { search: foodSearch, setSearch: setFoodSearch, filtered: filteredFoods } = useSearch(foodStore.store);
  const foodInput = useRef<HTMLInputElement>(null);
  // the substitution pickers offer every food; unlike the main field they can't create one
  const allFoods = foodStore.store;
  const showCreateFood = !!foodSearch && !filteredFoods.some(f => (f.name ?? "").toLowerCase() === foodSearch.toLowerCase());

  async function createAssignFood() {
    const food = await foodStore.actions.createOne({ ...foodData.data, name: foodSearch });
    update({ food: food || undefined });
    foodData.reset();
    foodInput.current?.blur();
  }

  // Units
  const unitStore = useUnitStore();
  const unitsData = useUnitData();
  const { search: unitSearch, setSearch: setUnitSearch, filtered: filteredUnits } = useSearch(unitStore.store);
  const unitInput = useRef<HTMLInputElement>(null);
  const showCreateUnit = !!unitSearch && !filteredUnits.some(u => (u.name ?? "").toLowerCase() === unitSearch.toLowerCase());

  async function createAssignUnit() {
    const unit = await unitStore.actions.createOne({ ...unitsData.data, name: unitSearch });
    update({ unit: unit || undefined });
    unitsData.reset();
    unitInput.current?.blur();
  }

  // Recipes
  const params = useParams();
  const auth = useMealieAuth();
  const groupSlug = params.groupSlug || auth.user?.groupSlug || "";
  const { isOwnGroup } = useLoggedInState();
  const userApi = useUserApi();
  const exploreApi = usePublicExploreApi(groupSlug).explore;
  const search = useRecipeSearch(isOwnGroup ? userApi : exploreApi);

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
    update({ substitutions: [...(latest.current.substitutions || []), { substituteFoodId: null, note: "" }] });
    setShowSubstitutions(true);
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
    if (isRecipeState) update({ referencedRecipe: undefined });
    else update({ unit: undefined, food: undefined });
    setIsRecipe(!isRecipeState);
  }

  const header = enableDragHandle || enableContextMenu;
  const flex = (value: string) => (display.mdAndDown ? {} : { flex: value });

  const form = (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ display: "flex", gap: 1, py: 1, flexDirection: display.mdAndDown ? "column" : "row" }}>
        <Box sx={flex("3 0 50px")}>
          <NumberInput
            value={model.quantity ?? null}
            onChange={quantity => update({ quantity })}
            variant="filled"
            min={0}
            hideDetails
            placeholder={i18n.t("recipe.quantity")}
            onKeyDown={(e) => {
              if (e.key === "-" || e.key === "+" || e.key === "e") e.preventDefault();
            }}
          />
        </Box>
        <Box sx={flex("4 0 50px")}>
          <AutocompleteInput<IngredientUnit>
            inputRef={unitInput}
            value={model.unit ?? null}
            onChange={(unit: IngredientUnit | null) => update({ unit: unit ?? undefined })}
            search={unitSearch}
            onSearchChange={setUnitSearch}
            autoSelectFirst
            hideDetails
            variant="filled"
            returnObject
            items={filteredUnits}
            disableFilter
            itemTitle="name"
            placeholder={i18n.t("recipe.choose-unit")}
            clearable
            noDataText={i18n.t("recipe.press-enter-to-create")}
            prependInner={<ErrorAdornment error={unitError} tooltip={unitErrorTooltip} />}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (!latest.current.unit || !latest.current.unit.name.includes(unitSearch))) void createAssignUnit();
            }}
          />
          {showCreateUnit && <Box sx={{ px: 1 }}><BaseButton fullWidth small onClick={() => void createAssignUnit()} /></Box>}
        </Box>
        {!isRecipeState
          ? (
              <Box sx={flex("7 0 50px")}>
                <AutocompleteInput<IngredientFood>
                  inputRef={foodInput}
                  value={model.food ?? null}
                  onChange={(food: IngredientFood | null) => update({ food: food ?? undefined })}
                  search={foodSearch}
                  onSearchChange={setFoodSearch}
                  autoSelectFirst
                  hideDetails
                  variant="filled"
                  returnObject
                  items={filteredFoods}
                  disableFilter
                  itemTitle="name"
                  placeholder={i18n.t("recipe.choose-food")}
                  clearable
                  noDataText={i18n.t("recipe.press-enter-to-create")}
                  prependInner={<ErrorAdornment error={foodError} tooltip={foodErrorTooltip} />}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (!latest.current.food || !latest.current.food.name.includes(foodSearch))) void createAssignFood();
                  }}
                />
                {showCreateFood && <Box sx={{ px: 1 }}><BaseButton fullWidth small onClick={() => void createAssignFood()} /></Box>}
              </Box>
            )
          : (
              <Box sx={flex("7 0 50px")} onClick={() => void search.trigger()}>
                <AutocompleteInput<Recipe>
                  value={model.referencedRecipe ?? null}
                  onChange={(recipe: Recipe | null) => update({ referencedRecipe: recipe ?? undefined })}
                  search={search.query}
                  onSearchChange={search.setQuery}
                  autoSelectFirst
                  hideDetails
                  variant="filled"
                  returnObject
                  items={search.data || []}
                  disableFilter
                  itemTitle="name"
                  placeholder={i18n.t("search.type-to-search")}
                  clearable
                  label={!model.referencedRecipe ? i18n.t("recipe.choose-recipe") : ""}
                />
              </Box>
            )}
        <Box sx={flex("7 0 50px")} onClick={() => onClickIngredientField?.("note")}>
          <TextInput value={model.note ?? ""} onChange={note => update({ note })} hideDetails variant="filled" placeholder={i18n.t("recipe.notes")} />
        </Box>
      </Box>
    </Box>
  );

  return (
    <div>
      {titleVisible && (
        <Box sx={{ mx: 0.5, mt: 1.5, mb: 2, maxWidth: 500 }} onClick={() => onClickIngredientField?.("title")}>
          <TextInput value={model.title ?? ""} onChange={title => update({ title })} variant="underlined" hideDetails placeholder={i18n.t("recipe.section-title")} />
        </Box>
      )}
      {header
        ? (
            <>
              <Box sx={{ display: "flex", pt: 1, alignItems: "center" }}>
                {enableDragHandle && (
                  <Box ref={dragHandle?.ref} {...dragHandle?.attributes} {...dragHandle?.listeners} className="handle" sx={{ m: 1, display: "flex", cursor: "grab" }}>
                    <Icon path={icons.arrowUpDown} size="large" />
                  </Box>
                )}
                {!display.mdAndDown && form}
                {enableContextMenu && (
                  <Box sx={{ ml: "auto" }}>
                    <BaseButtonGroup
                      large={false}
                      buttons={btns}
                      onEvent={(e) => {
                        switch (e) {
                          case "toggle-section": toggleTitle(); break;
                          case "toggle-subrecipe": toggleIsRecipe(); break;
                          case "toggle-substitutions": toggleSubstitutions(); break;
                          case "insert-above": onInsertAbove?.(); break;
                          case "insert-below": onInsertBelow?.(); break;
                          case "delete": onDelete?.(); break;
                        }
                      }}
                    />
                  </Box>
                )}
              </Box>
              {display.mdAndDown && form}
            </>
          )
        : form}
      <Box sx={{ px: 1, ...(!display.mdAndDown ? { ml: 5 } : {}) }}>
        {/* shown whenever the ingredient carries substitutions, so the toggle can't hide saved data */}
        {substitutionsVisible && (
          <Box sx={{ py: 1 }}>
            <Typography variant="caption" component="div" sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
              <Icon path={icons.swapHorizontal} size="small" sx={{ mr: 0.5 }} />
              {i18n.t("recipe.substitutions")}
            </Typography>
            <RecipeIngredientSubstitutionEditor
              substitutions={model.substitutions || []}
              foods={allFoods}
              onChangeRow={(index, row) => update({ substitutions: (latest.current.substitutions || []).map((s, i) => (i === index ? row : s)) })}
              onAdd={addSubstitution}
              onDelete={(index) => {
                update({ substitutions: (latest.current.substitutions || []).filter((_s, i) => i !== index) });
                // removing the last row leaves the section open; the user is still working in it
                setShowSubstitutions(true);
              }}
            />
          </Box>
        )}
        {beforeDivider}
      </Box>
    </div>
  );
}

export default RecipeIngredientEditor;
