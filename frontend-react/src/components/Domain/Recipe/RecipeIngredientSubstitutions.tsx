// Usage: <RecipeIngredientSubstitutions ingredient={ingredient} scale={scale} /> — a small swap button next to an
// ingredient that opens a menu with the substitutions the recipe declares for the line and the ones the food
// carries everywhere. Renders nothing when the ingredient has no substitutions.
import { useState } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import IconButton from "@mui/material/IconButton";
import Popover from "@mui/material/Popover";
import { MdiIcon } from "@/components/global/MdiIcon";
import { SafeMarkdown } from "@/components/global/SafeMarkdown";
import { substitutionFoodName, useFoodPlurality, useIngredientSubstitutions } from "@/hooks/recipes";
import { useI18n } from "@/i18n";
import type { IngredientFoodSubstitution, RecipeIngredient } from "@/lib/api/types/recipe";
import { icons } from "@/lib/icons";

interface RecipeIngredientSubstitutionsProps {
  ingredient: RecipeIngredient;
  scale?: number;
}

interface SubstitutionSection {
  key: string;
  title: string;
  items: IngredientFoodSubstitution[];
  dimmed: boolean;
}

// the markdown renders a paragraph; here it sits inline next to the food name
const inlineMarkdown = { "display": "inline", "& > div": { display: "inline" }, "& p": { display: "inline", m: 0 } };

export function RecipeIngredientSubstitutions({ ingredient, scale = 1 }: RecipeIngredientSubstitutionsProps) {
  const { t } = useI18n();
  const { recipeSubstitutions, foodSubstitutions, hasSubstitutions } = useIngredientSubstitutions(ingredient);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  // a substitute stands in for the food at this line's quantity and unit, so it takes the same
  // plural form the food itself does -- both sections alike, since they sit under the one line
  const { shouldPluralizeFood } = useFoodPlurality();
  const pluralFood = shouldPluralizeFood(ingredient, scale);

  if (!hasSubstitutions) {
    return null;
  }

  // what this recipe says comes first and at full strength; what the food suggests everywhere
  // sits behind it, and says so, which is what makes the first heading need no qualifier
  const sections: SubstitutionSection[] = [
    {
      key: "recipe",
      title: t("recipe.substitutions"),
      items: recipeSubstitutions,
      dimmed: false,
    },
    {
      key: "food",
      title: t("recipe.commonly-substituted-with"),
      items: foodSubstitutions,
      dimmed: true,
    },
  ].filter(section => section.items.length);

  return (
    <>
      {/* click, not hover alone: this is read in a kitchen, on a phone, where nothing hovers */}
      <IconButton
        aria-label={t("recipe.substitutions")}
        aria-haspopup="menu"
        aria-expanded={anchor !== null}
        sx={{
          "p": 0,
          "width": "1lh",
          "height": "1lh",
          "lineHeight": "inherit",
          "color": "inherit",
          "opacity": 0.7,
          "&::before": { content: "\"\"", position: "absolute", inset: "-0.75rem" },
        }}
        onClick={(event) => {
          event.stopPropagation();
          setAnchor(event.currentTarget);
        }}
      >
        <MdiIcon path={icons.swapHorizontal} />
      </IconButton>
      <Popover
        open={anchor !== null}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{ paper: { sx: { maxWidth: 360 } } }}
        onClick={event => event.stopPropagation()}
      >
        <Card className="ingredient-substitutions" elevation={0}>
          <CardContent sx={{ "py": 1, "px": 1.5, "fontSize": "0.875rem", "&:last-child": { pb: 1 } }}>
            {sections.map((section, sectionIndex) => (
              <Box
                key={section.key}
                className={section.dimmed ? "food-substitutions" : undefined}
                sx={{ opacity: section.dimmed ? 0.7 : 1, mt: sectionIndex ? 2.5 : 0 }}
              >
                <Box
                  className="substitution-header"
                  sx={{ fontSize: "0.75rem", fontWeight: 500, borderBottom: "thin solid", borderColor: "divider", pb: "0.2rem", mb: "0.4rem" }}
                >
                  {section.title}
                </Box>
                {section.items.map((substitution, i) => (
                  <Box key={i} className="substitution" sx={{ "lineHeight": 1.35, "& + .substitution": { mt: "0.5rem" } }}>
                    {substitution.substituteFood
                      ? (
                          <>
                            <Box component="span" className="substitution-primary" sx={{ fontWeight: "bold" }}>
                              {substitutionFoodName(substitution, pluralFood)}
                            </Box>
                            {substitution.note && (
                              <Box className="substitution-note" sx={[inlineMarkdown, { opacity: 0.7 }]}>
                                <SafeMarkdown source={substitution.note} />
                              </Box>
                            )}
                          </>
                        )
                      : substitution.note
                        ? (
                            // with no food the note is the substitution itself, so it reads like one, the way
                            // an ingredient with a note and no food renders bold rather than dimmed
                            <Box className="substitution-primary" sx={[inlineMarkdown, { fontWeight: "bold" }]}>
                              <SafeMarkdown source={substitution.note} />
                            </Box>
                          )
                        : null}
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
