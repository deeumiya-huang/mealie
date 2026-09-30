import { useRef, useState } from "react";
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
import { icons } from "~/lib/icons";
import type { NoUndefinedField } from "~/lib/api/types/non-generated";
import type { Recipe, RecipeIngredient } from "~/lib/api/types/recipe";
import { usePageState } from "~/hooks/recipe-page/shared-state";
import { useI18n } from "~/hooks/use-global-i18n";
import { uuid4 } from "~/hooks/use-utils";
import { BaseButton } from "~/components/global/BaseButton";
import { Icon } from "~/components/global/Icon";
import { SortableList } from "~/components/global/SortableList";
import { RecipeDialogBulkAdd } from "../../RecipeDialogBulkAdd";
import type { RecipeDialogBulkAddHandle } from "../../RecipeDialogBulkAdd";
import { RecipeIngredientEditor } from "../../RecipeIngredientEditor";

type Ingredients = NoUndefinedField<Recipe>["recipeIngredient"];

function newIngredient(note = "", extra: Partial<RecipeIngredient> = {}): RecipeIngredient {
  return { referenceId: uuid4(), title: "", note, unit: undefined, food: undefined, quantity: 0, ...extra };
}

export function RecipePageIngredientEditor({ value: recipe, onChange }: { value: NoUndefinedField<Recipe>; onChange: (recipe: NoUndefinedField<Recipe>) => void }) {
  const i18n = useI18n();
  const { toggleIsParsing } = usePageState(recipe.slug);
  const ingredientsWithRecipe = useRef(new Map<string, boolean>());
  const domBulkAddDialog = useRef<RecipeDialogBulkAddHandle>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const latest = useRef(recipe);
  latest.current = recipe;

  const setIngredients = (fn: (list: RecipeIngredient[]) => RecipeIngredient[]) =>
    onChange({ ...latest.current, recipeIngredient: fn(latest.current.recipeIngredient) as Ingredients });

  const hasFoodOrUnit = (recipe.recipeIngredient ?? []).some(ingredient => ingredient.food || ingredient.unit);

  function ingredientIsRecipe(ingredient: RecipeIngredient): boolean {
    if (ingredient.referencedRecipe) return true;
    if (ingredient.referenceId) return !!ingredientsWithRecipe.current.get(ingredient.referenceId);
    return false;
  }

  function addIngredient(ingredients: string[] | null = null) {
    if (ingredients?.length) setIngredients(list => [...list, ...ingredients.map(x => newIngredient(x))]);
    else setIngredients(list => [...list, newIngredient()]);
  }

  function addRecipe() {
    const refId = uuid4();
    ingredientsWithRecipe.current.set(refId, true);
    setIngredients(list => [...list, { referenceId: refId, title: "", note: "", unit: undefined, referencedRecipe: undefined, quantity: 1 }]);
  }

  function insertNewIngredient(dest: number) {
    setIngredients((list) => {
      const next = [...list];
      next.splice(dest, 0, newIngredient());
      return next;
    });
  }

  return (
    <div>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" component="h2" sx={{ mb: 2, fontWeight: 500, opacity: 0.8 }}>{i18n.t("recipe.ingredients")}</Typography>
        {!hasFoodOrUnit && (
          <Alert severity="info" icon={<Icon path={icons.information} />} sx={{ borderInlineStart: 4, borderColor: "info.main" }}>
            <div>{i18n.t("recipe.ingredients-not-parsed-description", { parse: i18n.t("recipe.parse") })}</div>
            <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", mt: 1.5 }}>
              <BaseButton sx={{ mb: 0.5 }} color="info" onClick={() => toggleIsParsing(true)} iconSlot={<Icon path={icons.foods} />}>
                {i18n.t("recipe.parse")}
              </BaseButton>
            </Box>
          </Alert>
        )}
      </Box>
      {recipe.recipeIngredient.length > 0
        ? (
            <SortableList
              items={recipe.recipeIngredient}
              getId={(ing, i) => ing.referenceId ?? `ing-${i}`}
              onReorder={next => onChange({ ...latest.current, recipeIngredient: next as Ingredients })}
              renderItem={(ingredient, index, handle) => (
                <RecipeIngredientEditor
                  value={ingredient}
                  onChange={next => setIngredients(list => list.map((x, i) => (i === index ? next : x)))}
                  isRecipe={ingredientIsRecipe(ingredient)}
                  enableDragHandle
                  enableContextMenu
                  dragHandle={handle}
                  onDelete={() => setIngredients(list => list.filter((_x, i) => i !== index))}
                  onInsertAbove={() => insertNewIngredient(index)}
                  onInsertBelow={() => insertNewIngredient(index + 1)}
                />
              )}
            />
          )
        : (
            <Paper elevation={2} sx={{ p: 2 }}>
              <Skeleton variant="text" animation={false} />
            </Paper>
          )}
      <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: { xs: "center", sm: "flex-end" }, mt: 1.5 }}>
        <Box sx={{ display: "none" }}>
          <RecipeDialogBulkAdd ref={domBulkAddDialog} onBulkData={addIngredient} />
        </Box>
        <Box sx={{ display: "inline-flex" }}>
          <Button
            color="success"
            variant="contained"
            sx={{ ml: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
            onClick={() => addIngredient()}
            startIcon={<Icon path={icons.createAlt} />}
          >
            {i18n.t("general.add") || "Add Food"}
          </Button>
          <Button
            color="success"
            variant="contained"
            sx={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0, minWidth: 30, px: 0 }}
            onClick={e => setMenuAnchor(e.currentTarget)}
          >
            <Icon path={icons.chevronDown} />
          </Button>
          <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)} onClick={() => setMenuAnchor(null)}>
            <MenuItem onClick={() => addIngredient()}>
              <ListItemIcon><Icon path={icons.foods} /></ListItemIcon>
              <ListItemText>{i18n.t("new-recipe.add-food")}</ListItemText>
            </MenuItem>
            <MenuItem onClick={addRecipe}>
              <ListItemIcon><Icon path={icons.silverwareForkKnife} /></ListItemIcon>
              <ListItemText>{i18n.t("new-recipe.add-recipe")}</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => domBulkAddDialog.current?.open()}>
              <ListItemIcon><Icon path={icons.create} /></ListItemIcon>
              <ListItemText>{i18n.t("new-recipe.bulk-add")}</ListItemText>
            </MenuItem>
          </Menu>
        </Box>
      </Box>
    </div>
  );
}

export default RecipePageIngredientEditor;
