import { useMemo } from "react";
import DOMPurify from "dompurify";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { icons } from "~/lib/icons";
import type { Recipe, RecipeIngredient, RecipeStep } from "~/lib/api/types/recipe";
import type { NoUndefinedField } from "~/lib/api/types/non-generated";
import { useStaticRoutes } from "~/hooks/api";
import { useI18n } from "~/hooks/use-global-i18n";
import { ImagePosition, useUserPrintPreferences } from "~/hooks/use-users/preferences";
import { ingredientSubstitutionSummary, useFoodPlurality, useIngredientTextParser, useNutritionLabels } from "~/hooks/recipes";
import { usePageState } from "~/hooks/recipe-page/shared-state";
import { useScaledAmount } from "~/hooks/recipes/use-scaled-amount";
import { Icon } from "~/components/global/Icon";
import { SafeMarkdown } from "~/components/global/SafeMarkdown";
import { RecipeTimeCard } from "./RecipeTimeCard";

type IngredientSection = {
  sectionName: string;
  ingredients: RecipeIngredient[];
};

type InstructionSection = {
  sectionName: string;
  stepOffset: number;
  instructions: RecipeStep[];
};

export interface RecipePrintViewProps {
  recipe: NoUndefinedField<Recipe>;
  scale?: number;
  dense?: boolean;
}

function sanitizeHTML(rawHtml: string) {
  return DOMPurify.sanitize(rawHtml, {
    USE_PROFILES: { html: true },
    ALLOWED_TAGS: ["strong", "sup"],
  });
}

const headline = { fontSize: "1.5rem", fontWeight: 400, py: 1.5, display: "flex", alignItems: "center" } as const;

export function RecipePrintView({ recipe, scale = 1, dense = false }: RecipePrintViewProps) {
  const i18n = useI18n();
  const [preferences] = useUserPrintPreferences();
  const { recipeImage } = useStaticRoutes();
  const { imageKey } = usePageState(recipe.slug);
  const { labels } = useNutritionLabels();
  const { parseIngredientText } = useIngredientTextParser();
  const { shouldPluralizeFood } = useFoodPlurality();

  const servingsDisplay = (() => {
    const { scaledAmountDisplay } = useScaledAmount(recipe.recipeYieldQuantity, scale);
    return scaledAmountDisplay || recipe.recipeYield
      ? i18n.t("recipe.yields-amount-with-text", { amount: scaledAmountDisplay, text: recipe.recipeYield })
      : "";
  })();
  const yieldDisplay = (() => {
    const { scaledAmountDisplay } = useScaledAmount(recipe.recipeServings, scale);
    return scaledAmountDisplay ? i18n.t("recipe.serves-amount", { amount: scaledAmountDisplay }) : "";
  })();
  const recipeYield = servingsDisplay && yieldDisplay
    ? sanitizeHTML(`${yieldDisplay}; ${servingsDisplay}`)
    : sanitizeHTML(yieldDisplay || servingsDisplay);

  const recipeImageUrl = recipeImage(recipe.id, recipe.image, imageKey);

  // Group ingredients by section so we can style them independently
  const ingredientSections = useMemo<IngredientSection[]>(() => {
    if (!recipe.recipeIngredient) return [];
    const addIngredientsToSections = (ingredients: RecipeIngredient[], sections: IngredientSection[], title: string | null) => {
      // If title is set, ensure the section exists before adding ingredients
      if (title) {
        if (!sections.find(sec => sec.sectionName === title)) {
          sections.push({ sectionName: title, ingredients: [] });
        }
      }

      ingredients.forEach((original) => {
        if (preferences.expandChildRecipes && original.referencedRecipe?.recipeIngredient?.length) {
          // Recursively add to the section for this referenced recipe
          addIngredientsToSections(original.referencedRecipe.recipeIngredient, sections, "");
        }
        else {
          const sectionName = title || original.title || "";
          if (sectionName) {
            let sec = sections.find(s => s.sectionName === sectionName);
            if (!sec) {
              sec = { sectionName, ingredients: [] };
              sections.push(sec);
            }
            sec.ingredients.push({ ...original, title: sectionName });
          }
          else if (sections.length === 0) {
            sections.push({ sectionName: "", ingredients: [original] });
          }
          else {
            sections[sections.length - 1]!.ingredients.push(original);
          }
        }
      });
    };

    const sections: IngredientSection[] = [];
    addIngredientsToSections(recipe.recipeIngredient, sections, null);
    return sections;
  }, [recipe.recipeIngredient, preferences.expandChildRecipes]);

  // Group instructions by section so we can style them independently
  const instructionSections = useMemo<InstructionSection[]>(() => {
    if (!recipe.recipeInstructions) return [];
    return recipe.recipeInstructions.reduce((sections, step) => {
      const last = sections[sections.length - 1];
      const offset = last ? last.stepOffset + last.instructions.length : 0;

      // if title append new section to the end of the array
      if (step.title || !last) {
        sections.push({ sectionName: step.title || "", stepOffset: offset, instructions: [step] });
        return sections;
      }

      // otherwise add step to last section in the array
      last.instructions.push(step);
      return sections;
    }, [] as InstructionSection[]);
  }, [recipe.recipeInstructions]);

  const hasNotes = recipe.notes && recipe.notes.length > 0;

  // Precompute each step's linked ingredients
  const stepLinkedIngredients = useMemo(() => {
    const map = new Map<string, RecipeIngredient[]>();
    instructionSections.forEach((section, sectionIndex) => {
      section.instructions.forEach((step, stepIndex) => {
        if (!step.ingredientReferences?.length) return;
        const referenceIds = new Set(step.ingredientReferences.map(ref => ref.referenceId));
        map.set(
          `${sectionIndex}-${stepIndex}`,
          recipe.recipeIngredient.filter(ing => ing.referenceId && referenceIds.has(ing.referenceId)),
        );
      });
    });
    return map;
  }, [instructionSections, recipe.recipeIngredient]);

  const parseText = (ingredient: RecipeIngredient) => parseIngredientText(ingredient, scale);
  // the substitutes inflect with the line they stand in for, the same as on screen
  const substitutionSummary = (ingredient: RecipeIngredient) => ingredientSubstitutionSummary(ingredient, shouldPluralizeFood(ingredient, scale));

  const nutrition = (recipe.nutrition ?? {}) as unknown as Record<string, string | null | undefined>;

  return (
    <Box
      sx={{
        p: dense ? 0 : 1.5,
        bgcolor: "white",
        "&, & *": { opacity: "1 !important", color: "black !important" },
        "& p": { pb: "0 !important", mb: "0 !important" },
        "& .print-section": { pageBreakInside: "avoid" },
        "& .ingredient-grid": { display: "grid", gridAutoFlow: "column", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" },
        "& .step-ingredient-grid": { display: "grid", gridAutoFlow: "column", gridTemplateColumns: "1fr 1fr", gap: "0.2rem" },
        "& .ingredient-title, & .instruction-title": { gridColumn: "1 / span 2", textDecoration: "underline", textUnderlineOffset: "4px" },
        "& .ingredient-body, & .recipe-step-body, & .note-body": { fontSize: 14 },
        "& .ingredient-cell": { breakInside: "avoid" },
        "& .substitution-body": { fontSize: 12, lineHeight: 1.3, opacity: "0.7 !important" },
        "& .nutrition-table": { maxWidth: "80%", borderCollapse: "collapse" },
        "& .nutrition-table td": { p: "2px", textAlign: "left", fontSize: 14 },
        "& .nutrition-table td:first-of-type": { width: "70%", fontWeight: "bold" },
        "& .nutrition-table td:last-of-type": { width: "30%", textAlign: "right" },
      }}
    >
      <section>
        <Grid container spacing={2}>
          {recipe.image && preferences.imagePosition && preferences.imagePosition !== ImagePosition.hidden && (
            <Grid size={4} sx={{ alignSelf: "center", order: preferences.imagePosition === ImagePosition.left ? -1 : 1 }}>
              <img key={imageKey} src={recipeImageUrl} style={{ minHeight: 50, maxWidth: "100%" }} alt="" />
            </Grid>
          )}
          <Grid size="grow" sx={{ order: 0 }}>
            <Typography component="div" sx={headline}>
              <Icon path={icons.primary} start color="primary" />
              {recipe.name}
            </Typography>
            {recipeYield && (
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 3 }}>
                <div>
                  <Icon path={icons.potSteam} start />
                  {/* Sanitized above (strong/sup only). */}
                  <span dangerouslySetInnerHTML={{ __html: recipeYield }} />
                </div>
              </Box>
            )}
            <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
              <RecipeTimeCard
                prepTime={recipe.prepTime}
                totalTime={recipe.totalTime}
                performTime={recipe.performTime}
                prepTimeSeconds={recipe.prepTimeSeconds}
                totalTimeSeconds={recipe.totalTimeSeconds}
                performTimeSeconds={recipe.performTimeSeconds}
                small
                color="white"
                className="ml-4"
              />
            </Box>
            {preferences.showDescription && (
              <Box sx={{ px: 0, py: 1 }}>
                <SafeMarkdown source={recipe.description} />
              </Box>
            )}
          </Grid>
        </Grid>
      </section>

      <section>
        <Typography component="div" sx={headline}>{i18n.t("recipe.ingredients")}</Typography>
        {ingredientSections.map((ingredientSection, sectionIndex) => (
          <div key={`ingredient-section-${sectionIndex}`} className="print-section">
            {ingredientSection.ingredients[0]?.title && (
              <h4 className="ingredient-title" style={{ marginTop: 8 }}>{ingredientSection.ingredients[0].title}</h4>
            )}
            <div className="ingredient-grid" style={{ gridTemplateRows: `repeat(${Math.ceil(ingredientSection.ingredients.length / 2)}, min-content)` }}>
              {ingredientSection.ingredients.map((ingredient, ingredientIndex) => (
                <div key={`ingredient-${ingredientIndex}`} className="ingredient-cell">
                  {/* parseIngredientText output is sanitized with DOMPurify. */}
                  <p className="ingredient-body" dangerouslySetInnerHTML={{ __html: parseText(ingredient) }} />
                  {/* paper has nothing to tap, so what the menu holds on screen is spelled out here */}
                  {preferences.showSubstitutions && substitutionSummary(ingredient) && (
                    <div className="substitution-body">
                      <SafeMarkdown source={i18n.t("recipe.substitutions-with-value", { substitutions: substitutionSummary(ingredient) })} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section>
        {instructionSections.map((instructionSection, sectionIndex) => (
          <div key={`instruction-section-${sectionIndex}`} className={instructionSection.sectionName ? "print-section" : undefined}>
            {!sectionIndex && <Typography component="div" sx={headline}>{i18n.t("recipe.instructions")}</Typography>}
            {instructionSection.instructions.map((step, stepIndex) => (
              <div key={`instruction-${stepIndex}`}>
                <div className="print-section">
                  {step.title && <h4 className="instruction-title" style={{ marginBottom: 8 }}>{step.title}</h4>}
                  <h5>{step.summary ? step.summary : i18n.t("recipe.step-index", { step: stepIndex + instructionSection.stepOffset + 1 })}</h5>
                  <div className="recipe-step-body"><SafeMarkdown source={step.text} /></div>
                  {preferences.showLinkedIngredients && step.ingredientReferences && step.ingredientReferences.length > 0 && (
                    <div className="print-section">
                      <h6 className="ingredient-title" style={{ marginTop: 8, marginBottom: 0 }}>{i18n.t("recipe.ingredients")}</h6>
                      <div className="step-ingredient-grid" style={{ gridTemplateRows: `repeat(${Math.ceil(step.ingredientReferences.length / 2)}, min-content)` }}>
                        {(stepLinkedIngredients.get(`${sectionIndex}-${stepIndex}`) ?? []).map((ingredient, ingredientIndex) => (
                          <p key={`ingredient-${ingredientIndex}`} className="ingredient-body" dangerouslySetInnerHTML={{ __html: parseText(ingredient) }} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </section>

      {preferences.showNotes && (
        <div>
          {hasNotes && <Divider sx={{ my: 2 }} />}
          <section>
            {recipe.notes.map((note, index) => (
              <div key={index + "note"}>
                <div className="print-section">
                  <h4>{note.title}</h4>
                  <div className="note-body"><SafeMarkdown source={note.text} /></div>
                </div>
              </div>
            ))}
          </section>
        </div>
      )}

      {preferences.showNutrition && (
        <div>
          <Typography component="div" sx={headline}>{i18n.t("recipe.nutrition")}</Typography>
          <section>
            <div className="print-section">
              <table className="nutrition-table">
                <tbody>
                  {Object.entries(nutrition).map(([key, value]) => (
                    <tr key={key}>
                      {value && labels[key] && (
                        <>
                          <td>{labels[key].label}</td>
                          <td>{labels[key].suffix ? `${value} ${labels[key].suffix}` : value}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </Box>
  );
}

export default RecipePrintView;
