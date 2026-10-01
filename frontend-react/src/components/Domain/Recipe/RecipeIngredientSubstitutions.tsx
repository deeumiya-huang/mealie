import { useState } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import IconButton from "@mui/material/IconButton";
import Popover from "@mui/material/Popover";
import { icons } from "~/lib/icons";
import type { IngredientFoodSubstitution, RecipeIngredient } from "~/lib/api/types/recipe";
import { substitutionFoodName, useFoodPlurality, useIngredientSubstitutions } from "~/hooks/recipes";
import { useI18n } from "~/hooks/use-global-i18n";
import { Icon } from "~/components/global/Icon";
import { SafeMarkdown } from "~/components/global/SafeMarkdown";

interface SubstitutionSection {
  key: string;
  title: string;
  items: IngredientFoodSubstitution[];
  dimmed: boolean;
}

export function RecipeIngredientSubstitutions({ ingredient, scale = 1 }: { ingredient: RecipeIngredient; scale?: number }) {
  const i18n = useI18n();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const { recipeSubstitutions, foodSubstitutions, hasSubstitutions } = useIngredientSubstitutions(() => ingredient);
  // a substitute stands in for the food at this line's quantity and unit, so it takes the same plural form
  const { shouldPluralizeFood } = useFoodPlurality();
  const pluralFood = shouldPluralizeFood(ingredient, scale);

  if (!hasSubstitutions) return null;

  // what this recipe says comes first and at full strength; what the food suggests everywhere sits behind it
  const sections: SubstitutionSection[] = ([
    { key: "recipe", title: i18n.t("recipe.substitutions"), items: recipeSubstitutions, dimmed: false },
    { key: "food", title: i18n.t("recipe.commonly-substituted-with"), items: foodSubstitutions, dimmed: true },
  ] as SubstitutionSection[]).filter(section => section.items.length);

  return (
    <>
      {/* click, not hover alone: this is read in a kitchen, on a phone, where nothing hovers */}
      <IconButton
        size="small"
        aria-label={i18n.t("recipe.substitutions")}
        onClick={(e) => {
          e.stopPropagation();
          setAnchor(e.currentTarget);
        }}
        sx={{ width: "1lh", height: "1lh", p: 0, opacity: 0.7 }}
      >
        <Icon path={icons.swapHorizontal} fontSize="small" />
      </IconButton>
      <Popover open={!!anchor} anchorEl={anchor} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: "bottom", horizontal: "left" }}>
        <Card sx={{ maxWidth: 360 }}>
          <CardContent sx={{ py: 1, px: 1.5, typography: "body2" }}>
            {sections.map((section, sectionIndex) => (
              <Box key={section.key} sx={{ ...(section.dimmed ? { opacity: 0.7 } : {}), ...(sectionIndex ? { mt: 2.5 } : {}) }}>
                <Box sx={{ typography: "caption", fontWeight: 500, borderBottom: 1, borderColor: "divider", pb: "0.2rem", mb: "0.4rem" }}>
                  {section.title}
                </Box>
                {section.items.map((substitution, i) => (
                  <Box key={i} sx={{ "lineHeight": 1.35, "& + &": { mt: 1 }, "& p": { display: "inline", m: 0 } }}>
                    {substitution.substituteFood
                      ? (
                          <>
                            <span style={{ fontWeight: "bold" }}>{substitutionFoodName(substitution, pluralFood)}</span>
                            {substitution.note && <SafeMarkdown inline sx={{ opacity: 0.7, ml: 0.5 }} source={substitution.note} />}
                          </>
                        )
                      // with no food the note is the substitution itself, so it reads like one
                      : substitution.note && <SafeMarkdown inline sx={{ fontWeight: "bold" }} source={substitution.note} />}
                  </Box>
                ))}
              </Box>
            ))}
          </CardContent>
        </Card>
      </Popover>
    </>
  );
}

export default RecipeIngredientSubstitutions;
