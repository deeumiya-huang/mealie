// Usage: <RecipeDialogAddToShoppingList open={open} onOpenChange={setOpen} recipes={[{ ...recipe, scale: 1 }]}
//   shoppingLists={lists} />
// Two-step dialog: pick a shopping list (skipped when the user has exactly one), then tick the ingredients of the
// recipes (linked recipes included) to add to it. Ingredients the household already has on hand start unticked.
import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Checkbox from "@mui/material/Checkbox";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import ListItemButton from "@mui/material/ListItemButton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useNavigate } from "react-router";
import { BaseButtonGroup } from "@/components/global/BaseButtonGroup";
import { BaseDialog } from "@/components/global/BaseDialog";
import { BasePageTitle } from "@/components/global/BasePageTitle";
import { MdiIcon } from "@/components/global/MdiIcon";
import { useUserApi } from "@/hooks/api";
import { useMealieAuth } from "@/hooks/use-mealie-auth";
import { alert } from "@/hooks/use-toast";
import { useShoppingListPreferences } from "@/hooks/use-users/preferences";
import { useDisplay } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import type { UserApi } from "@/lib/api";
import type { RecipeIngredient, ShoppingListAddRecipeParamsBulk, ShoppingListSummary } from "@/lib/api/types/household";
import type { Recipe } from "@/lib/api/types/recipe";
import { icons } from "@/lib/icons";
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

interface RecipeDialogAddToShoppingListProps {
  recipes?: RecipeWithScale[];
  shoppingLists?: ShoppingListSummary[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function buildIngredientSections(ingredients: ShoppingListIngredient[], householdSlug: string): ShoppingListIngredientSection[] {
  let currentTitle = "";
  const onHandIngs: ShoppingListIngredient[] = [];
  const sections = ingredients.reduce((acc, ing) => {
    if (ing.ingredient.title) {
      currentTitle = ing.ingredient.title;
    }

    if (!acc.length || currentTitle !== acc[acc.length - 1]?.sectionName) {
      const previous = acc[acc.length - 1];
      if (previous) {
        previous.ingredients.push(...onHandIngs);
        onHandIngs.length = 0;
      }
      acc.push({ sectionName: currentTitle, ingredients: [] });
    }

    const householdsWithFood = ing.ingredient?.food?.householdsWithIngredientFood || [];
    if (householdsWithFood.includes(householdSlug)) {
      onHandIngs.push(ing);
      return acc;
    }

    acc[acc.length - 1]?.ingredients.push(ing);
    return acc;
  }, [] as ShoppingListIngredientSection[]);

  const last = sections[sections.length - 1];
  if (last) {
    last.ingredients.push(...onHandIngs);
  }
  return sections;
}

async function consolidateRecipesIntoSections(
  recipes: RecipeWithScale[],
  householdSlug: string,
  api: UserApi,
): Promise<ShoppingListRecipeIngredientSection[]> {
  const recipeSectionMap = new Map<string, ShoppingListRecipeIngredientSection>();

  function addSubRecipeToMap(ing: RecipeIngredient, parentQuantity: number, parentScale: number, parentRecipe: Recipe) {
    const subRecipe = ing.referencedRecipe;
    if (!subRecipe) {
      return;
    }
    const key = subRecipe.id || subRecipe.slug || "";
    const ownIngs: ShoppingListIngredient[] = [];
    const subRefIngs: RecipeIngredient[] = [];

    for (const subIng of subRecipe.recipeIngredient ?? []) {
      if (subIng.referencedRecipe) {
        subRefIngs.push(subIng);
      }
      else {
        const householdsWithFood = subIng.food?.householdsWithIngredientFood || [];
        ownIngs.push({
          checked: !householdsWithFood.includes(householdSlug),
          ingredient: subIng,
        });
      }
    }

    recipeSectionMap.set(key, {
      recipeId: subRecipe.id || "",
      recipeName: subRecipe.name || "",
      recipeScale: parentQuantity * parentScale,
      ingredientSections: buildIngredientSections(ownIngs, householdSlug),
      parentRecipe,
    });

    subRefIngs.forEach(subIng => addSubRecipeToMap(subIng, (ing.quantity || 1) * (subIng.quantity || 1), parentScale, subRecipe as Recipe));
  }

  for (const recipe of recipes) {
    if (!recipe.slug) {
      continue;
    }

    if (recipeSectionMap.has(recipe.slug)) {
      const existingSection = recipeSectionMap.get(recipe.slug);
      if (existingSection) {
        existingSection.recipeScale += recipe.scale;
      }
      continue;
    }

    // Create a local copy to avoid mutating props
    let recipeData = { ...recipe };
    if (!(recipeData.id && recipeData.name && recipeData.recipeIngredient)) {
      const { data } = await api.recipes.getOne(recipe.slug);
      if (!data?.recipeIngredient?.length) {
        continue;
      }
      recipeData = {
        ...recipeData,
        id: data.id || "",
        name: data.name || "",
        recipeIngredient: data.recipeIngredient,
      };
    }
    else if (!recipeData.recipeIngredient.length) {
      continue;
    }

    const ownIngs: ShoppingListIngredient[] = [];
    const subRefIngs: RecipeIngredient[] = [];
    (recipeData.recipeIngredient ?? []).forEach((ing) => {
      if (ing.referencedRecipe) {
        subRefIngs.push(ing);
      }
      else {
        const householdsWithFood = ing.food?.householdsWithIngredientFood || [];
        ownIngs.push({
          checked: !householdsWithFood.includes(householdSlug),
          ingredient: ing,
        });
      }
    });

    recipeSectionMap.set(recipe.slug, {
      recipeId: recipeData.id ?? "",
      recipeName: recipeData.name ?? "",
      recipeScale: recipeData.scale,
      ingredientSections: buildIngredientSections(ownIngs, householdSlug),
    });

    subRefIngs.forEach(ing => addSubRecipeToMap(ing, ing.quantity || 1, recipeData.scale, recipeData));
  }

  return Array.from(recipeSectionMap.values());
}

export function RecipeDialogAddToShoppingList({ recipes, shoppingLists = [], open: dialog = false, onOpenChange }: RecipeDialogAddToShoppingListProps) {
  const { t } = useI18n();
  const auth = useMealieAuth();
  const api = useUserApi();
  const navigate = useNavigate();
  const { smAndDown } = useDisplay();
  const [preferences, setPreferences] = useShoppingListPreferences();

  // Values captured when the dialog opens, so later changes don't reshuffle it
  const [currentHouseholdSlug, setCurrentHouseholdSlug] = useState("");
  const [filteredShoppingLists, setFilteredShoppingLists] = useState<ShoppingListSummary[]>([]);
  const [ready, setReady] = useState(false);

  const [shoppingListDialog, setShoppingListDialog] = useState(false);
  const [shoppingListIngredientDialog, setShoppingListIngredientDialog] = useState(false);
  const [shoppingListShowAllToggled, setShoppingListShowAllToggled] = useState(false);
  const [recipeIngredientSections, setRecipeIngredientSections] = useState<ShoppingListRecipeIngredientSection[]>([]);
  const [selectedShoppingList, setSelectedShoppingList] = useState<ShoppingListSummary | null>(null);
  // the list whose ingredient step opens by itself (the user has exactly one list)
  const [autoOpenList, setAutoOpenList] = useState<ShoppingListSummary | null>(null);

  const recipesRef = useRef(recipes);
  useEffect(() => {
    recipesRef.current = recipes;
  });

  // When the dialog opens/closes or the "view all lists" preference changes (Vue: watch([dialog, viewAllLists])).
  const viewAllLists = preferences.viewAllLists;
  const [watched, setWatched] = useState({ dialog: false, viewAllLists });
  if (watched.dialog !== dialog || watched.viewAllLists !== viewAllLists) {
    setWatched({ dialog, viewAllLists });
    if (dialog) {
      const filtered = shoppingLists.filter(list => viewAllLists || list.userId === auth.user?.id);
      setCurrentHouseholdSlug(auth.user?.householdSlug || "");
      setFilteredShoppingLists(filtered);

      const only = filtered[0];
      if (filtered.length === 1 && only && !shoppingListShowAllToggled) {
        setSelectedShoppingList(only);
        setAutoOpenList(only);
      }
      else {
        setShoppingListDialog(true);
        setReady(true);
      }
    }
    else {
      setShoppingListDialog(false);
      setShoppingListIngredientDialog(false);
      setShoppingListShowAllToggled(false);
      setRecipeIngredientSections([]);
      setSelectedShoppingList(null);
      setAutoOpenList(null);
    }
  }

  function showIngredientStep(sections: ShoppingListRecipeIngredientSection[]) {
    setRecipeIngredientSections(sections);
    setShoppingListDialog(false);
    setShoppingListIngredientDialog(true);
  }

  // the single list opens straight to its ingredients
  useEffect(() => {
    const currentRecipes = recipesRef.current;
    if (!autoOpenList || !currentRecipes?.length) {
      return;
    }
    let active = true;
    void consolidateRecipesIntoSections(currentRecipes, currentHouseholdSlug, api).then((sections) => {
      if (active) {
        showIngredientStep(sections);
        setAutoOpenList(null);
      }
    });
    return () => {
      active = false;
    };
  }, [autoOpenList, currentHouseholdSlug, api]);

  async function openShoppingListIngredientDialog(list: ShoppingListSummary) {
    if (!recipes?.length) {
      return;
    }

    setSelectedShoppingList(list);
    showIngredientStep(await consolidateRecipesIntoSections(recipes, currentHouseholdSlug, api));
  }

  function setChecked(update: (ingredient: ShoppingListIngredient, location: [number, number, number]) => boolean) {
    setRecipeIngredientSections(sections => sections.map((recipeSection, r) => ({
      ...recipeSection,
      ingredientSections: recipeSection.ingredientSections.map((ingSection, s) => ({
        ...ingSection,
        ingredients: ingSection.ingredients.map((ing, i) => ({ ...ing, checked: update(ing, [r, s, i]) })),
      })),
    })));
  }

  function toggleIngredient(location: [number, number, number]) {
    setChecked((ing, [r, s, i]) => (r === location[0] && s === location[1] && i === location[2] ? !ing.checked : ing.checked));
  }

  function bulkCheckIngredients(value = true) {
    setChecked(() => value);
  }

  async function addRecipesToList() {
    if (!selectedShoppingList) {
      return;
    }

    const recipeData: ShoppingListAddRecipeParamsBulk[] = [];
    recipeIngredientSections.forEach((section) => {
      const ingredients: RecipeIngredient[] = [];
      section.ingredientSections.forEach((ingSection) => {
        ingSection.ingredients.forEach((ing) => {
          if (ing.checked) {
            ingredients.push(ing.ingredient);
          }
        });
      });

      if (!ingredients.length) {
        return;
      }

      recipeData.push(
        {
          recipeId: section.recipeId,
          recipeIncrementQuantity: section.recipeScale,
          recipeIngredients: ingredients,
        },
      );
    });
    const listId = selectedShoppingList.id;
    const { error } = await api.shopping.lists.addRecipes(listId, recipeData);
    if (error) {
      alert.error(t("recipe.failed-to-add-recipes-to-list"));
    }
    else {
      alert.success(t("recipe.successfully-added-to-list"), null, {
        action: {
          message: t("general.view"),
          onClick: () => void navigate(`/shopping-lists/${listId ?? ""}`),
        },
      });
    }

    setShoppingListDialog(false);
    setShoppingListIngredientDialog(false);
    onOpenChange?.(false);
  }

  if (!dialog) {
    return null;
  }

  return (
    <Box>
      {shoppingListDialog && ready && (
        <BaseDialog
          open={dialog}
          onOpenChange={onOpenChange}
          bottomSheet
          title={t("recipe.add-to-list")}
          icon={icons.cartCheck}
          cardActions={(
            <>
              <Button variant="text" sx={{ color: "grey.600" }} onClick={() => onOpenChange?.(false)}>
                {t("general.cancel")}
              </Button>
              <Box sx={{ display: "flex", justifyContent: "flex-end", width: "100%" }}>
                <FormControlLabel
                  sx={{ my: "auto", mr: 2 }}
                  control={(
                    <Checkbox
                      checked={preferences.viewAllLists}
                      onClick={() => setShoppingListShowAllToggled(true)}
                      onChange={(_event, checked) => setPreferences({ ...preferences, viewAllLists: checked })}
                    />
                  )}
                  label={t("general.show-all")}
                />
              </Box>
            </>
          )}
        >
          {!filteredShoppingLists.length && (
            <Container>
              <BasePageTitle title={t("shopping-list.no-shopping-lists-found")} />
            </Container>
          )}
          <CardContent>
            {filteredShoppingLists.map(list => (
              <Card
                key={list.id}
                sx={{ my: 1, borderLeft: "5px solid", borderLeftColor: "primary.main" }}
              >
                <CardActionArea onClick={() => void openShoppingListIngredientDialog(list)}>
                  <Typography variant="h6" component="div" sx={{ py: 1, px: 2, fontWeight: 400 }}>
                    {list.name}
                  </Typography>
                </CardActionArea>
              </Card>
            ))}
          </CardContent>
        </BaseDialog>
      )}
      {shoppingListIngredientDialog && (
        <BaseDialog
          open={dialog}
          onOpenChange={onOpenChange}
          title={selectedShoppingList?.name || t("recipe.add-to-list")}
          icon={icons.cartCheck}
          width="70%"
          submitText={t("recipe.add-to-list")}
          canSubmit
          onSubmit={() => void addRecipesToList()}
        >
          <Box sx={{ maxHeight: "70vh", overflowY: "auto" }}>
            {recipeIngredientSections.map((recipeSection, recipeSectionIndex) => (
              <Card
                key={recipeSection.recipeId + recipeSectionIndex}
                elevation={0}
                sx={{ height: "fit-content", width: "100%" }}
              >
                {recipeSectionIndex > 0 && <Divider sx={{ mt: 1.5 }} />}
                {recipeIngredientSections.length > 1 && (
                  <Box sx={{ width: "100%", p: 2, textAlign: "center" }}>
                    <Typography variant="h5" component="div">
                      {recipeSection.recipeName}
                      {recipeSection.parentRecipe?.name && (
                        <Tooltip placement="top" title={t("shopping-list.ingredient-of-recipe", { recipe: recipeSection.parentRecipe.name })}>
                          <Box component="span" sx={{ cursor: "pointer", ml: 1, mb: 1 }}>
                            <MdiIcon path={icons.potSteam} size="small" />
                          </Box>
                        </Tooltip>
                      )}
                    </Typography>
                    {recipeSection.recipeScale > 1 && (
                      <Box sx={{ textAlign: "center" }}>
                        {`(${t("recipe.quantity")}: ${recipeSection.recipeScale})`}
                      </Box>
                    )}
                  </Box>
                )}
                <div>
                  {recipeSection.ingredientSections.map((ingredientSection, ingredientSectionIndex) => (
                    <div key={recipeSection.recipeId + recipeSectionIndex + ingredientSectionIndex}>
                      {ingredientSection.sectionName && (
                        <Typography variant="h6" component="div" sx={{ mt: 1, pb: 0, px: 2, pt: 1, fontWeight: 400 }}>
                          {ingredientSection.sectionName}
                        </Typography>
                      )}
                      <Box
                        sx={smAndDown
                          ? undefined
                          : {
                              display: "grid",
                              gridAutoFlow: "column",
                              gridTemplateColumns: "1fr 1fr",
                              gap: "0.5rem",
                              gridTemplateRows: `repeat(${Math.ceil(ingredientSection.ingredients.length / 2)}, min-content)`,
                            }}
                      >
                        {ingredientSection.ingredients.map((ingredientData, i) => (
                          <ListItemButton
                            key={recipeSection.recipeId + recipeSectionIndex + ingredientSectionIndex + i}
                            dense
                            onClick={() => toggleIngredient([recipeSectionIndex, ingredientSectionIndex, i])}
                          >
                            <Box sx={{ display: "flex", alignItems: "center" }}>
                              <Checkbox
                                color="secondary"
                                size="small"
                                checked={ingredientData.checked}
                                sx={{ mr: 1 }}
                                onChange={() => undefined}
                              />
                              <Box key={`${ingredientData.ingredient?.quantity || "no-qty"}-${i}`}>
                                <RecipeIngredientListItem
                                  ingredient={ingredientData.ingredient}
                                  scale={recipeSection.recipeScale}
                                />
                              </Box>
                            </Box>
                          </ListItemButton>
                        ))}
                      </Box>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </Box>
          <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2, mt: 1 }}>
            <BaseButtonGroup
              buttons={[
                {
                  icon: icons.checkboxMultipleBlankOutline,
                  text: t("shopping-list.uncheck-all-items"),
                  event: "uncheck",
                },
                {
                  icon: icons.checkboxMultipleMarkedOutline,
                  text: t("shopping-list.check-all-items"),
                  event: "check",
                },
              ]}
              onAction={event => bulkCheckIngredients(event === "check")}
            />
          </Box>
        </BaseDialog>
      )}
    </Box>
  );
}
