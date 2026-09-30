import { useState } from "react";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import type { RecipeIngredient } from "~/lib/api/types/recipe";
import { storageStore } from "~/lib/storage";
import { useStore } from "~/lib/store";
import { useIngredientTextParser } from "~/hooks/recipes";
import { useI18n } from "~/hooks/use-global-i18n";
import { AppButtonCopy } from "~/components/global/AppButtonCopy";
import { RecipeIngredientListItem } from "./RecipeIngredientListItem";

export interface RecipeIngredientsProps {
  value?: RecipeIngredient[];
  scale?: number;
  isCookMode?: boolean;
  /** Session-storage key that keeps checked ingredients across reloads. */
  storageKey?: string;
}

const noStorage = storageStore<Record<string, boolean>>("__recipe-ingredients-unused__", {}, "session");

export function RecipeIngredients({ value = [], scale = 1, isCookMode = false, storageKey }: RecipeIngredientsProps) {
  const i18n = useI18n();
  const { parseIngredientText } = useIngredientTextParser();
  const [transientChecked, setTransientChecked] = useState<Record<string, boolean>>({});
  const session = storageKey ? storageStore<Record<string, boolean>>(storageKey, {}, "session") : noStorage;
  const sessionChecked = useStore(session);
  const checkedState = storageKey ? sessionChecked : transientChecked;

  if (!value || value.length === 0) return null;

  const validateTitle = (title?: string | null) => !(title === undefined || title === "" || title === null);

  const components: string[] = [];
  value.forEach((ingredient) => {
    if (ingredient.title) {
      if (components.length) components.push("");
      components.push(`[${ingredient.title}]`);
    }
    components.push(parseIngredientText(ingredient, scale, false));
  });
  const ingredientCopyText = components.join("\n");

  const checkedKey = (index: number) => {
    const referenceId = value[index]?.referenceId;
    return referenceId ? `ref:${referenceId}` : `idx:${index}`;
  };
  const isChecked = (index: number) => !!checkedState[checkedKey(index)];
  const setChecked = (index: number, checked: boolean) => {
    const next = { ...checkedState, [checkedKey(index)]: checked };
    if (storageKey) session.set(next);
    else setTransientChecked(next);
  };

  return (
    <div>
      {!isCookMode && (
        <Box sx={{ display: "flex", justifyContent: "flex-start", alignItems: "center" }}>
          <Typography variant="h5" component="h2" sx={{ mt: 0.5, fontWeight: 500, opacity: 0.8 }}>{i18n.t("recipe.ingredients")}</Typography>
          <Box sx={{ ml: "auto" }}><AppButtonCopy copyText={ingredientCopyText} /></Box>
        </Box>
      )}
      <div>
        {value.map((ingredient, index) => (
          <div key={"ingredient" + index}>
            {validateTitle(ingredient.title) && (
              <>
                <Typography variant="h6" component="h3" sx={{ mt: 2, mb: 0 }}>{ingredient.title}</Typography>
                <Divider sx={{ my: 1 }} />
              </>
            )}
            <Box
              className="ingredient-list-item"
              sx={{ display: "flex", alignItems: "flex-start", px: 0, py: 0.5, cursor: "pointer", borderRadius: 1, "&:hover": { bgcolor: "action.hover" } }}
              onClick={() => setChecked(index, !isChecked(index))}
            >
              <Checkbox
                checked={isChecked(index)}
                color="secondary"
                sx={{ pt: 0.5, mt: 0, alignSelf: "flex-start" }}
                onClick={e => e.stopPropagation()}
                onChange={e => setChecked(index, e.target.checked)}
              />
              <Box sx={{ flex: 1, minWidth: 0, pt: 0.75, overflow: "visible" }}>
                <RecipeIngredientListItem ingredient={ingredient} scale={scale} showSubstitutions />
              </Box>
            </Box>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RecipeIngredients;
