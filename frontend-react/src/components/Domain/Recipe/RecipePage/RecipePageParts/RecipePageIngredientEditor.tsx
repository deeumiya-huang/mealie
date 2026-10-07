// Usage: <RecipePageIngredientEditor recipe={recipe} onChange={update} /> — the ingredient editor of the recipe page:
// a hint with a "Parse" button while no ingredient has a food or unit, the draggable ingredient rows, and an "Add"
// split button (food, linked recipe, bulk add). (Vue `v-model` → `recipe` + `onChange`.)
import { useRef, useState, type MouseEvent } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";
import { RecipeDialogBulkAdd, type RecipeDialogBulkAddHandle } from "@/components/Domain/Recipe/RecipeDialogBulkAdd";
import { RecipeIngredientEditor } from "@/components/Domain/Recipe/RecipeIngredientEditor";
import { BaseButton } from "@/components/global/BaseButton";
import { MdiIcon } from "@/components/global/MdiIcon";
import { usePageState } from "@/hooks/recipe-page/shared-state";
import { uuid4 } from "@/hooks/use-utils";
import { moveItem, useSortable } from "@/hooks/utils/use-sortable";
import { useI18n } from "@/i18n";
import type { RecipeIngredient } from "@/lib/api/types/recipe";
import { icons } from "@/lib/icons";
import { asModel, type RecipeChange, type RecipeModel } from "../recipe-model";

interface RecipePageIngredientEditorProps {
  recipe: RecipeModel;
  onChange: RecipeChange;
}

type Ingredients = RecipeModel["recipeIngredient"];

function emptyIngredient(): RecipeIngredient {
  return {
    referenceId: uuid4(),
    title: "",
    note: "",
    unit: undefined,
    food: undefined,
    quantity: 0,
  };
}

export function RecipePageIngredientEditor({ recipe, onChange }: RecipePageIngredientEditorProps) {
  const { t } = useI18n();
  // reference ids of rows added as a linked recipe (Vue: a non-reactive Map)
  const [ingredientsWithRecipe, setIngredientsWithRecipe] = useState<ReadonlySet<string>>(() => new Set());
  const domBulkAddDialog = useRef<RecipeDialogBulkAddHandle>(null);
  const [addMenu, setAddMenu] = useState<HTMLElement | null>(null);
  const { toggleIsParsing } = usePageState(recipe.slug);

  const setIngredients = (update: (list: Ingredients) => Ingredients) =>
    onChange(prev => ({ ...prev, recipeIngredient: update(prev.recipeIngredient) }));

  let hasFoodOrUnit = false;
  if (recipe.recipeIngredient) {
    for (const ingredient of recipe.recipeIngredient) {
      if (ingredient.food || ingredient.unit) {
        hasFoodOrUnit = true;
        break;
      }
    }
  }

  function showBulkAdd() {
    domBulkAddDialog.current?.open();
  }

  function ingredientIsRecipe(ingredient: RecipeIngredient): boolean {
    if (ingredient.referencedRecipe) {
      return true;
    }

    if (ingredient.referenceId) {
      return ingredientsWithRecipe.has(ingredient.referenceId);
    }

    return false;
  }

  function addIngredient(ingredients: Array<string> | null = null) {
    if (ingredients?.length) {
      const newIngredients = ingredients.map((x) => {
        return asModel<RecipeIngredient>({
          referenceId: uuid4(),
          title: "",
          note: x,
          unit: undefined,
          food: undefined,
          quantity: 0,
        });
      });

      setIngredients(list => [...list, ...newIngredients]);
    }
    else {
      const ingredient = asModel(emptyIngredient());
      setIngredients(list => [...list, ingredient]);
    }
  }

  function addRecipe(recipes: Array<string> | null = null) {
    const refId = uuid4();
    setIngredientsWithRecipe(ids => new Set(ids).add(refId));

    if (recipes?.length) {
      const newRecipes = recipes.map((x) => {
        return asModel<RecipeIngredient>({
          referenceId: refId,
          title: "",
          note: x,
          unit: undefined,
          referencedRecipe: undefined,
          quantity: 1,
        });
      });

      setIngredients(list => [...list, ...newRecipes]);
    }
    else {
      const ingredient = asModel<RecipeIngredient>({
        referenceId: refId,
        title: "",
        note: "",
        unit: undefined,
        referencedRecipe: undefined,
        quantity: 1,
      });
      setIngredients(list => [...list, ingredient]);
    }
  }

  function insertNewIngredient(dest: number) {
    const ingredient = asModel(emptyIngredient());
    setIngredients((list) => {
      const next = [...list];
      next.splice(dest, 0, ingredient);
      return next;
    });
  }

  // drag and drop (Vue <VueDraggable handle=".handle" :delay="250" :delay-on-touch-only="true">)
  const listRef = useRef<HTMLDivElement>(null);
  useSortable(listRef, {
    handle: ".handle",
    delay: 250,
    delayOnTouchOnly: true,
    animation: 200,
    group: "recipe-ingredients",
    disabled: false,
    ghostClass: "ghost",
    onReorder: ({ oldIndex, newIndex }) => setIngredients(list => moveItem(list, oldIndex, newIndex)),
  });

  return (
    <div>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" component="h2" sx={{ mb: 2, fontWeight: 500, opacity: 0.8 }}>
          {t("recipe.ingredients")}
        </Typography>
        {!hasFoodOrUnit && (
          <Alert
            severity="info"
            variant="standard"
            icon={<MdiIcon path={icons.information} />}
            sx={{ "borderLeft": 4, "borderColor": "info.main", "& .MuiAlert-message": { width: "100%" } }}
          >
            <div>
              {t("recipe.ingredients-not-parsed-description", { parse: t("recipe.parse") })}
            </div>
            <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", mt: 1.5 }}>
              <Box sx={{ mb: 0.5 }}>
                <BaseButton color="info" icon={icons.foods} onClick={() => toggleIsParsing(true)}>
                  {t("recipe.parse")}
                </BaseButton>
              </Box>
            </Box>
          </Alert>
        )}
      </Box>
      {recipe.recipeIngredient.length > 0
        ? (
            <div ref={listRef}>
              {recipe.recipeIngredient.map((ingredient, index) => (
                <RecipeIngredientEditor
                  key={ingredient.referenceId}
                  value={ingredient}
                  onChange={value => setIngredients(list => list.map((item, i) => (i === index ? asModel(value) : item)))}
                  isRecipe={ingredientIsRecipe(ingredient)}
                  enableDragHandle
                  enableContextMenu
                  onDelete={() => setIngredients(list => list.filter((_, i) => i !== index))}
                  onInsertAbove={() => insertNewIngredient(index)}
                  onInsertBelow={() => insertNewIngredient(index + 1)}
                />
              ))}
            </div>
          )
        : (
            <Paper elevation={2} sx={{ p: 2 }}>
              <Skeleton variant="text" animation={false} />
            </Paper>
          )}
      <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: { xs: "center", sm: "flex-end" }, mt: 1.5 }}>
        <Box sx={{ display: "none" }}>
          <RecipeDialogBulkAdd ref={domBulkAddDialog} onBulkData={data => addIngredient(data)} />
        </Box>
        <Box sx={{ display: "inline-flex" }}>
          {/* Main button: Add Food */}
          <Button
            color="success"
            variant="contained"
            sx={{ ml: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
            startIcon={<MdiIcon path={icons.createAlt} />}
            onClick={() => addIngredient()}
          >
            {t("general.add")}
          </Button>
          {/* Dropdown button */}
          <Button
            color="success"
            variant="contained"
            aria-haspopup="menu"
            aria-expanded={!!addMenu}
            aria-label={t("general.menu")}
            sx={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0, minWidth: 30, px: 0 }}
            onClick={(event: MouseEvent<HTMLElement>) => setAddMenu(event.currentTarget)}
          >
            <MdiIcon path={icons.chevronDown} />
          </Button>
          <Menu open={!!addMenu} anchorEl={addMenu} onClose={() => setAddMenu(null)}>
            <MenuItem
              onClick={() => {
                setAddMenu(null);
                addIngredient();
              }}
            >
              <ListItemIcon><MdiIcon path={icons.foods} /></ListItemIcon>
              <ListItemText>{t("new-recipe.add-food")}</ListItemText>
            </MenuItem>
            <MenuItem
              onClick={() => {
                setAddMenu(null);
                addRecipe();
              }}
            >
              <ListItemIcon><MdiIcon path={icons.silverwareForkKnife} /></ListItemIcon>
              <ListItemText>{t("new-recipe.add-recipe")}</ListItemText>
            </MenuItem>
            <MenuItem
              onClick={() => {
                setAddMenu(null);
                showBulkAdd();
              }}
            >
              <ListItemIcon><MdiIcon path={icons.create} /></ListItemIcon>
              <ListItemText>{t("new-recipe.bulk-add")}</ListItemText>
            </MenuItem>
          </Menu>
        </Box>
      </Box>
    </div>
  );
}
