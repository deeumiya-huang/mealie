// Usage: <RecipeIngredients value={recipe.recipeIngredient} scale={scale} isCookMode={false} storageKey={key} /> — the
// ingredient checklist of the recipe page (section titles, a copy button, a checkbox per line). With `storageKey` the
// checked lines are kept in sessionStorage by reference id, so they survive reloads and reordering.
import { useId, useState } from "react";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import { AppButtonCopy } from "@/components/global/AppButtonCopy";
import { useIngredientTextParser } from "@/hooks/recipes";
import { useSessionStorage } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import type { RecipeIngredient } from "@/lib/api/types/recipe";
import { RecipeIngredientListItem } from "./RecipeIngredientListItem";

interface RecipeIngredientsProps {
  value?: RecipeIngredient[];
  scale?: number;
  isCookMode?: boolean;
  storageKey?: string;
}

function validateTitle(title?: string | null) {
  return !(title === undefined || title === "" || title === null);
}

const EMPTY: RecipeIngredient[] = [];

export function RecipeIngredients({ value = EMPTY, scale = 1, isCookMode = false, storageKey = undefined }: RecipeIngredientsProps) {
  const { t } = useI18n();
  const { parseIngredientText } = useIngredientTextParser();
  const idPrefix = useId();

  const [transientChecked, setTransientChecked] = useState<Record<string, boolean>>({});
  // only read and written when there is a storage key (Vue created the session ref only then)
  const [sessionChecked, setSessionChecked] = useSessionStorage<Record<string, boolean>>(storageKey ?? "", {});

  const showTitleEditor = value.map(x => validateTitle(x.title));

  const components: string[] = [];
  value.forEach((ingredient) => {
    if (ingredient.title) {
      if (components.length) {
        components.push("");
      }

      components.push(`[${ingredient.title}]`);
    }

    components.push(parseIngredientText(ingredient, scale, false));
  });
  const ingredientCopyText = components.join("\n");

  function checkedState() {
    return storageKey ? sessionChecked : transientChecked;
  }

  function checkedKey(index: number) {
    const referenceId = value[index]?.referenceId;
    return referenceId ? `ref:${referenceId}` : `idx:${index}`;
  }

  function isChecked(index: number) {
    return !!checkedState()[checkedKey(index)];
  }

  function setChecked(index: number, checked: boolean) {
    const key = checkedKey(index);

    if (storageKey) {
      setSessionChecked(state => ({ ...state, [key]: checked }));
    }
    else {
      setTransientChecked(state => ({ ...state, [key]: checked }));
    }
  }

  function toggleChecked(index: number) {
    setChecked(index, !isChecked(index));
  }

  if (!(value && value.length > 0)) {
    return null;
  }

  return (
    <div>
      {!isCookMode && (
        <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
          <Typography variant="h5" component="h2" sx={{ mt: 0.5, fontWeight: 500, opacity: 0.8 }}>
            {t("recipe.ingredients")}
          </Typography>
          <Box sx={{ ml: "auto" }}>
            <AppButtonCopy btnClass="ml-auto" copyText={ingredientCopyText} />
          </Box>
        </Box>
      )}
      <div>
        {value.map((ingredient, index) => (
          <div key={"ingredient" + index}>
            {showTitleEditor[index] && (
              <Typography variant="h6" component="h3" sx={{ mt: 4, mb: 0 }}>
                {ingredient.title}
              </Typography>
            )}
            {showTitleEditor[index] && <Divider sx={{ my: 1 }} />}
            <Box
              className="ingredient-list-item"
              sx={{ display: "flex", alignItems: "flex-start", px: 0, py: 0.5, cursor: "pointer" }}
              onClick={(event) => {
                event.stopPropagation();
                toggleChecked(index);
              }}
            >
              <Checkbox
                checked={isChecked(index)}
                color="secondary"
                size="medium"
                sx={{ alignSelf: "flex-start", mt: "-9px", mr: 1 }}
                slotProps={{ input: { "aria-labelledby": `${idPrefix}-${index}` } }}
                onClick={event => event.stopPropagation()}
                onChange={event => setChecked(index, event.target.checked)}
              />
              <Box id={`${idPrefix}-${index}`} sx={{ flex: "1 1 auto", minWidth: 0, overflow: "visible", alignSelf: "flex-start" }}>
                <RecipeIngredientListItem
                  ingredient={ingredient}
                  scale={scale}
                  showSubstitutions
                />
              </Box>
            </Box>
          </div>
        ))}
      </div>
    </div>
  );
}
