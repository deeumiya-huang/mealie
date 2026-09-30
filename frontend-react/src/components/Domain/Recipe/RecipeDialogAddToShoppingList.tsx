import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Checkbox from "@mui/material/Checkbox";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import ListItemButton from "@mui/material/ListItemButton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useNavigate } from "react-router";
import { icons } from "~/lib/icons";
import type { RecipeIngredient, ShoppingListAddRecipeParamsBulk, ShoppingListSummary } from "~/lib/api/types/household";
import type { Recipe } from "~/lib/api/types/recipe";
import { useUserApi } from "~/hooks/api";
import { useDisplay } from "~/hooks/use-display";
import { useI18n } from "~/hooks/use-global-i18n";
import { useMealieAuth } from "~/hooks/use-mealie-auth";
import { alert } from "~/hooks/use-toast";
import { useShoppingListPreferences } from "~/hooks/use-users/preferences";
import { BaseButtonGroup } from "~/components/global/BaseButtonGroup";
import { BaseDialog } from "~/components/global/BaseDialog";
import { BasePageTitle } from "~/components/global/BasePageTitle";
import { Icon } from "~/components/global/Icon";
import { CheckboxInput } from "~/components/global/form";
import { RecipeIngredientListItem } from "./RecipeIngredientListItem";

export interface RecipeWithScale extends Recipe {
  scale: number;
}

export interface ShoppingListIngredient {
  checked: boolean;
  ingredient: RecipeIngredient;
}

export interface ShoppingListIngredientSection {
  sectionName: string;
  ingredients: ShoppingListIngredient[];
}

export interface ShoppingListRecipeIngredientSection {
  recipeId: string;
  recipeName: string;
  recipeScale: number;
  ingredientSections: ShoppingListIngredientSection[];
  parentRecipe?: Recipe;
}

export interface RecipeDialogAddToShoppingListProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipes?: RecipeWithScale[];
  shoppingLists?: ShoppingListSummary[];
}

export function RecipeDialogAddToShoppingList({ open, onOpenChange, recipes, shoppingLists = [] }: RecipeDialogAddToShoppingListProps) {
  const i18n = useI18n();
  const auth = useMealieAuth();
  const api = useUserApi();
  const display = useDisplay();
  const navigate = useNavigate();
  const [preferences, setPreferences] = useShoppingListPreferences();

  const [ready, setReady] = useState(false);
  const [shoppingListDialog, setShoppingListDialog] = useState(false);
  const [shoppingListIngredientDialog, setShoppingListIngredientDialog] = useState(false);
  const showAllToggled = useRef(false);
  const [filteredShoppingLists, setFilteredShoppingLists] = useState<ShoppingListSummary[]>([]);
  const [recipeIngredientSections, setRecipeIngredientSections] = useState<ShoppingListRecipeIngredientSection[]>([]);
  const [selectedShoppingList, setSelectedShoppingList] = useState<ShoppingListSummary | null>(null);
  // Captured when the dialog opens, to avoid reactive updates while it is shown
  const currentHouseholdSlug = useRef("");

  function initState() {
    setShoppingListDialog(false);
    setShoppingListIngredientDialog(false);
    showAllToggled.current = false;
    setRecipeIngredientSections([]);
    setSelectedShoppingList(null);
  }

  function buildIngredientSections(ingredients: ShoppingListIngredient[]): ShoppingListIngredientSection[] {
    let currentTitle = "";
    const onHandIngs: ShoppingListIngredient[] = [];
    const sections = ingredients.reduce((acc, ing) => {
      if (ing.ingredient.title) {
        currentTitle = ing.ingredient.title;
      }

      if (!acc.length || currentTitle !== acc[acc.length - 1]!.sectionName) {
        if (acc.length) {
          acc[acc.length - 1]!.ingredients.push(...onHandIngs);
          onHandIngs.length = 0;
        }
        acc.push({ sectionName: currentTitle, ingredients: [] });
      }

      const householdsWithFood = ing.ingredient?.food?.householdsWithIngredientFood || [];
      if (householdsWithFood.includes(currentHouseholdSlug.current)) {
        onHandIngs.push(ing);
        return acc;
      }

      acc[acc.length - 1]!.ingredients.push(ing);
      return acc;
    }, [] as ShoppingListIngredientSection[]);

    if (sections.length) {
      sections[sections.length - 1]!.ingredients.push(...onHandIngs);
    }
    return sections;
  }

  async function consolidateRecipesIntoSections(input: RecipeWithScale[]) {
    const recipeSectionMap = new Map<string, ShoppingListRecipeIngredientSection>();

    function addSubRecipeToMap(ing: RecipeIngredient, parentQuantity: number, parentScale: number, parentRecipe: Recipe) {
      const subRecipe = ing.referencedRecipe!;
      const key = subRecipe.id || subRecipe.slug || "";
      const ownIngs: ShoppingListIngredient[] = [];
      const subRefIngs: RecipeIngredient[] = [];

      for (const subIng of subRecipe.recipeIngredient ?? []) {
        if (subIng.referencedRecipe) {
          subRefIngs.push(subIng);
        }
        else {
          const householdsWithFood = subIng.food?.householdsWithIngredientFood || [];
          ownIngs.push({ checked: !householdsWithFood.includes(currentHouseholdSlug.current), ingredient: subIng });
        }
      }

      recipeSectionMap.set(key, {
        recipeId: subRecipe.id || "",
        recipeName: subRecipe.name || "",
        recipeScale: parentQuantity * parentScale,
        ingredientSections: buildIngredientSections(ownIngs),
        parentRecipe,
      });

      subRefIngs.forEach(subIng => addSubRecipeToMap(subIng, (ing.quantity || 1) * (subIng.quantity || 1), parentScale, subRecipe));
    }

    for (const recipe of input) {
      if (!recipe.slug) continue;

      if (recipeSectionMap.has(recipe.slug)) {
        const existingSection = recipeSectionMap.get(recipe.slug);
        if (existingSection) existingSection.recipeScale += recipe.scale;
        continue;
      }

      // Create a local copy to avoid mutating props
      let recipeData = { ...recipe };
      if (!(recipeData.id && recipeData.name && recipeData.recipeIngredient)) {
        const { data } = await api.recipes.getOne(recipeData.slug!);
        if (!data?.recipeIngredient?.length) continue;
        recipeData = { ...recipeData, id: data.id || "", name: data.name || "", recipeIngredient: data.recipeIngredient };
      }
      else if (!recipeData.recipeIngredient.length) {
        continue;
      }

      const ownIngs: ShoppingListIngredient[] = [];
      const subRefIngs: RecipeIngredient[] = [];
      recipeData.recipeIngredient!.forEach((ing) => {
        if (ing.referencedRecipe) {
          subRefIngs.push(ing);
        }
        else {
          const householdsWithFood = ing.food?.householdsWithIngredientFood || [];
          ownIngs.push({ checked: !householdsWithFood.includes(currentHouseholdSlug.current), ingredient: ing });
        }
      });

      recipeSectionMap.set(recipe.slug, {
        recipeId: recipeData.id!,
        recipeName: recipeData.name!,
        recipeScale: recipeData.scale,
        ingredientSections: buildIngredientSections(ownIngs),
      });

      subRefIngs.forEach(ing => addSubRecipeToMap(ing, ing.quantity || 1, recipeData.scale, recipeData));
    }

    setRecipeIngredientSections(Array.from(recipeSectionMap.values()));
  }

  async function openShoppingListIngredientDialog(list: ShoppingListSummary) {
    if (!recipes?.length) return;
    setSelectedShoppingList(list);
    await consolidateRecipesIntoSections(recipes);
    setShoppingListDialog(false);
    setShoppingListIngredientDialog(true);
  }

  useEffect(() => {
    if (open) {
      currentHouseholdSlug.current = auth.user?.householdSlug || "";
      const filtered = shoppingLists.filter(list => preferences.viewAllLists || list.userId === auth.user?.id);
      setFilteredShoppingLists(filtered);

      if (filtered.length === 1 && !showAllToggled.current) {
        void openShoppingListIngredientDialog(filtered[0]!);
      }
      else {
        setShoppingListDialog(true);
        setReady(true);
      }
    }
    else {
      initState();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- mirrors the Vue watcher on [dialog, viewAllLists]
  }, [open, preferences.viewAllLists]);

  function toggleChecked(recipeIdx: number, sectionIdx: number, ingIdx: number) {
    setRecipeIngredientSections(prev => prev.map((r, ri) => ri !== recipeIdx
      ? r
      : {
          ...r,
          ingredientSections: r.ingredientSections.map((s, si) => si !== sectionIdx
            ? s
            : { ...s, ingredients: s.ingredients.map((ing, ii) => (ii === ingIdx ? { ...ing, checked: !ing.checked } : ing)) }),
        }));
  }

  function bulkCheckIngredients(value = true) {
    setRecipeIngredientSections(prev => prev.map(r => ({
      ...r,
      ingredientSections: r.ingredientSections.map(s => ({ ...s, ingredients: s.ingredients.map(ing => ({ ...ing, checked: value })) })),
    })));
  }

  async function addRecipesToList() {
    if (!selectedShoppingList) return;

    const recipeData: ShoppingListAddRecipeParamsBulk[] = [];
    recipeIngredientSections.forEach((section) => {
      const ingredients: RecipeIngredient[] = [];
      section.ingredientSections.forEach(ingSection => ingSection.ingredients.forEach((ing) => {
        if (ing.checked) ingredients.push(ing.ingredient);
      }));
      if (!ingredients.length) return;
      recipeData.push({ recipeId: section.recipeId, recipeIncrementQuantity: section.recipeScale, recipeIngredients: ingredients });
    });

    const listId = selectedShoppingList.id;
    const { error } = await api.shopping.lists.addRecipes(listId, recipeData);
    if (error) {
      alert.error(i18n.t("recipe.failed-to-add-recipes-to-list"));
    }
    else {
      alert.success(i18n.t("recipe.successfully-added-to-list"), null, {
        action: {
          message: i18n.t("general.view"),
          onClick: () => void navigate(`/shopping-lists/${listId ?? ""}`),
        },
      });
    }

    setShoppingListDialog(false);
    setShoppingListIngredientDialog(false);
    onOpenChange(false);
  }

  if (!open) return null;

  return (
    <div>
      {shoppingListDialog && ready && (
        <BaseDialog
          open={open}
          onOpenChange={onOpenChange}
          bottomSheet
          title={i18n.t("recipe.add-to-list")}
          icon={icons.cartCheck}
          cardActions={(
            <>
              <Button variant="text" color="grey2" onClick={() => onOpenChange(false)}>{i18n.t("general.cancel")}</Button>
              <Box sx={{ display: "flex", justifyContent: "flex-end", width: "100%" }}>
                <CheckboxInput
                  hideDetails
                  label={i18n.t("general.show-all")}
                  checked={preferences.viewAllLists}
                  onChange={(v) => {
                    showAllToggled.current = true;
                    setPreferences({ viewAllLists: v });
                  }}
                  sx={{ my: "auto", mr: 2 }}
                />
              </Box>
            </>
          )}
        >
          {!filteredShoppingLists.length && (
            <Container>
              <BasePageTitle title={i18n.t("shopping-list.no-shopping-lists-found")} />
            </Container>
          )}
          <CardContent>
            {filteredShoppingLists.map(list => (
              <Card key={list.id} sx={{ my: 1, borderInlineStart: 5, borderColor: "primary.main" }}>
                <CardActionArea onClick={() => void openShoppingListIngredientDialog(list)}>
                  <Typography variant="h6" sx={{ px: 2, py: 1 }}>{list.name}</Typography>
                </CardActionArea>
              </Card>
            ))}
          </CardContent>
        </BaseDialog>
      )}
      {shoppingListIngredientDialog && (
        <BaseDialog
          open={open}
          onOpenChange={onOpenChange}
          title={selectedShoppingList?.name || i18n.t("recipe.add-to-list")}
          icon={icons.cartCheck}
          width="70%"
          submitText={i18n.t("recipe.add-to-list")}
          canSubmit
          onSubmit={() => void addRecipesToList()}
        >
          <Box sx={{ maxHeight: "70vh", overflowY: "auto" }}>
            {recipeIngredientSections.map((recipeSection, recipeSectionIndex) => (
              <Box key={recipeSection.recipeId + recipeSectionIndex} sx={{ width: "100%" }}>
                {recipeSectionIndex > 0 && <Divider sx={{ mt: 1.5 }} />}
                {recipeIngredientSections.length > 1 && (
                  <Box sx={{ textAlign: "center", py: 1 }}>
                    <Typography variant="h5" component="div">
                      {recipeSection.recipeName}
                      {recipeSection.parentRecipe?.name && (
                        <Tooltip title={i18n.t("shopping-list.ingredient-of-recipe", { recipe: recipeSection.parentRecipe.name })} placement="top">
                          <span><Icon path={icons.potSteam} size="small" sx={{ mb: 1, ml: 1, cursor: "pointer" }} /></span>
                        </Tooltip>
                      )}
                    </Typography>
                    {recipeSection.recipeScale > 1 && (
                      // TODO: make this editable in the dialog and visible on single-recipe lists
                      <Typography>({i18n.t("recipe.quantity")}: {recipeSection.recipeScale})</Typography>
                    )}
                  </Box>
                )}
                {recipeSection.ingredientSections.map((ingredientSection, ingredientSectionIndex) => (
                  <div key={recipeSection.recipeId + recipeSectionIndex + ingredientSectionIndex}>
                    {ingredientSection.sectionName && (
                      <Typography variant="h6" sx={{ mt: 1, pb: 0, px: 2, textDecoration: "underline", textUnderlineOffset: "4px" }}>
                        {ingredientSection.sectionName}
                      </Typography>
                    )}
                    <Box
                      sx={display.smAndDown
                        ? undefined
                        : { display: "grid", gridAutoFlow: "column", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", gridTemplateRows: `repeat(${Math.ceil(ingredientSection.ingredients.length / 2)}, min-content)` }}
                    >
                      {ingredientSection.ingredients.map((ingredientData, i) => (
                        <ListItemButton
                          key={recipeSection.recipeId + recipeSectionIndex + ingredientSectionIndex + i}
                          dense
                          onClick={() => toggleChecked(recipeSectionIndex, ingredientSectionIndex, i)}
                        >
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <Checkbox checked={ingredientData.checked} color="secondary" size="small" sx={{ mr: 1 }} />
                            <div key={`${ingredientData.ingredient?.quantity || "no-qty"}-${i}`}>
                              <RecipeIngredientListItem ingredient={ingredientData.ingredient} scale={recipeSection.recipeScale} />
                            </div>
                          </Box>
                        </ListItemButton>
                      ))}
                    </Box>
                  </div>
                ))}
              </Box>
            ))}
          </Box>
          <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2, mt: 1 }}>
            <BaseButtonGroup
              buttons={[
                { icon: icons.checkboxMultipleBlankOutline, text: i18n.t("shopping-list.uncheck-all-items"), event: "uncheck" },
                { icon: icons.checkboxMultipleMarkedOutline, text: i18n.t("shopping-list.check-all-items"), event: "check" },
              ]}
              onEvent={e => bulkCheckIngredients(e === "check")}
            />
          </Box>
        </BaseDialog>
      )}
    </div>
  );
}

export default RecipeDialogAddToShoppingList;
