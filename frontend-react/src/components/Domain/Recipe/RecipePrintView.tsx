// Usage: <RecipePrintView recipe={recipe} scale={1} dense /> — the black-on-white print layout of a recipe
// (image, title, yield, times, description, ingredients, instructions, notes, nutrition), shaped by the user's
// print preferences. Used by the print-preferences dialog and the print container.
import { useMemo, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import DOMPurify from "dompurify";
import { MdiIcon } from "@/components/global/MdiIcon";
import { SafeMarkdown } from "@/components/global/SafeMarkdown";
import { useStaticRoutes } from "@/hooks/api";
import { usePageState } from "@/hooks/recipe-page/shared-state";
import { ingredientSubstitutionSummary, useFoodPlurality, useIngredientTextParser, useNutritionLabels } from "@/hooks/recipes";
import { useScaledAmount } from "@/hooks/recipes/use-scaled-amount";
import { ImagePosition, useUserPrintPreferences } from "@/hooks/use-users/preferences";
import { useI18n } from "@/i18n";
import type { Recipe, RecipeIngredient, RecipeStep } from "@/lib/api/types/recipe";
import { icons } from "@/lib/icons";
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

interface RecipePrintViewProps {
  recipe: Recipe;
  scale?: number;
  dense?: boolean;
}

function sanitizeHTML(rawHtml: string) {
  return DOMPurify.sanitize(rawHtml, {
    USE_PROFILES: { html: true },
    ALLOWED_TAGS: ["strong", "sup"],
  });
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ fontSize: "1.25rem", fontWeight: 500, lineHeight: 1.6, pt: 1, pb: 1, pl: 0, pr: 2 }}>
      {children}
    </Box>
  );
}

// Group ingredients by section so we can style them independently
function groupIngredientSections(recipeIngredient: RecipeIngredient[], expandChildRecipes: boolean): IngredientSection[] {
  const sections: IngredientSection[] = [];

  const addIngredientsToSections = (ingredients: RecipeIngredient[], title: string | null) => {
    // If title is set, ensure the section exists before adding ingredients
    if (title) {
      if (!sections.find(sec => sec.sectionName === title)) {
        sections.push({ sectionName: title, ingredients: [] });
      }
    }

    ingredients.forEach((ingredient) => {
      if (expandChildRecipes && ingredient.referencedRecipe?.recipeIngredient?.length) {
        // Recursively add to the section for this referenced recipe
        addIngredientsToSections(ingredient.referencedRecipe.recipeIngredient, "");
      }
      else {
        const sectionName = title || ingredient.title || "";
        if (sectionName) {
          let sec = sections.find(sec => sec.sectionName === sectionName);
          if (!sec) {
            sec = { sectionName, ingredients: [] };
            sections.push(sec);
          }
          sec.ingredients.push({ ...ingredient, title: sectionName });
        }
        else {
          const last = sections[sections.length - 1];
          if (!last) {
            sections.push({ sectionName: "", ingredients: [ingredient] });
          }
          else {
            last.ingredients.push(ingredient);
          }
        }
      }
    });
  };

  addIngredientsToSections(recipeIngredient, null);
  return sections;
}

// Group instructions by section so we can style them independently
function groupInstructionSections(recipeInstructions: RecipeStep[]): InstructionSection[] {
  return recipeInstructions.reduce((sections, step) => {
    const last = sections[sections.length - 1];
    const offset = last ? last.stepOffset + last.instructions.length : 0;

    // if title append new section to the end of the array
    if (step.title) {
      sections.push({ sectionName: step.title, stepOffset: offset, instructions: [step] });
      return sections;
    }

    // append if first element
    if (!last) {
      sections.push({ sectionName: "", stepOffset: offset, instructions: [step] });
      return sections;
    }

    // otherwise add step to last section in the array
    last.instructions.push(step);
    return sections;
  }, [] as InstructionSection[]);
}

export function RecipePrintView({ recipe, scale = 1, dense = false }: RecipePrintViewProps) {
  const { t } = useI18n();
  const [preferences] = useUserPrintPreferences();
  const { recipeImage } = useStaticRoutes();
  const { imageKey } = usePageState(recipe.slug ?? "");
  const { labels } = useNutritionLabels();
  const { parseIngredientText } = useIngredientTextParser();
  const { shouldPluralizeFood } = useFoodPlurality();

  const servingsDisplay = (() => {
    const { scaledAmountDisplay } = useScaledAmount(recipe.recipeYieldQuantity ?? 0, scale);
    return scaledAmountDisplay || recipe.recipeYield
      ? t("recipe.yields-amount-with-text", {
          amount: scaledAmountDisplay,
          text: recipe.recipeYield,
        })
      : "";
  })();

  const yieldDisplay = (() => {
    const { scaledAmountDisplay } = useScaledAmount(recipe.recipeServings ?? 0, scale);
    return scaledAmountDisplay ? t("recipe.serves-amount", { amount: scaledAmountDisplay }) : "";
  })();

  const recipeYield = servingsDisplay && yieldDisplay
    ? sanitizeHTML(`${yieldDisplay}; ${servingsDisplay}`)
    : sanitizeHTML(yieldDisplay || servingsDisplay);

  const recipeImageUrl = recipeImage(recipe.id ?? "", recipe.image, imageKey);

  const ingredientSections = useMemo(
    () => groupIngredientSections(recipe.recipeIngredient ?? [], preferences.expandChildRecipes),
    [recipe.recipeIngredient, preferences.expandChildRecipes],
  );

  const instructionSections = useMemo(
    () => groupInstructionSections(recipe.recipeInstructions ?? []),
    [recipe.recipeInstructions],
  );

  const hasNotes = !!recipe.notes && recipe.notes.length > 0;

  // Precompute each step's linked ingredients so the template doesn't re-filter recipeIngredient on every render
  const stepLinkedIngredients = useMemo(() => {
    const map = new Map<string, RecipeIngredient[]>();

    instructionSections.forEach((section, sectionIndex) => {
      section.instructions.forEach((step, stepIndex) => {
        if (!step.ingredientReferences?.length) {
          return;
        }

        const referenceIds = new Set(step.ingredientReferences.map(ref => ref.referenceId));
        map.set(
          `${sectionIndex}-${stepIndex}`,
          (recipe.recipeIngredient ?? []).filter(ing => ing.referenceId && referenceIds.has(ing.referenceId)),
        );
      });
    });

    return map;
  }, [instructionSections, recipe.recipeIngredient]);

  function parseText(ingredient: RecipeIngredient) {
    return parseIngredientText(ingredient, scale);
  }

  // the substitutes inflect with the line they stand in for, the same as on screen
  function substitutionSummary(ingredient: RecipeIngredient) {
    return ingredientSubstitutionSummary(ingredient, shouldPluralizeFood(ingredient, scale));
  }

  const showImage = !!recipe.image && !!preferences.imagePosition && preferences.imagePosition !== ImagePosition.hidden;

  return (
    <Box
      className={dense ? "wrapper" : "wrapper pa-3"}
      sx={{
        "bgcolor": "white",
        "p": dense ? 0 : 1.5,
        // Makes all text solid black
        "&, & *": { opacity: "1 !important", color: "black !important" },
        "& p": { pb: "0 !important", mb: "0 !important" },
        "& ul": { pl: 2 },
        "& li": { listStyleType: "none", mb: 0.25 },
        "& .print-section": { breakInside: "avoid", pageBreakInside: "avoid" },
        "& .ingredient-title, & .instruction-title": { gridColumn: "1 / span 2", textDecoration: "underline", textUnderlineOffset: "4px" },
        "& .ingredient-body, & .recipe-step-body, & .note-body": { fontSize: 14 },
        "& .ingredient-cell": { breakInside: "avoid" },
        "& .substitution-body": { fontSize: 12, lineHeight: 1.3 },
        "& .substitution-body p": { m: 0 },
      }}
    >
      <section>
        <Box sx={{ display: "flex", flexWrap: "wrap", m: 0, p: 0 }}>
          {showImage && (
            <Box sx={{ flex: "0 0 33.3333%", maxWidth: "33.3333%", alignSelf: "center", p: 1, order: preferences.imagePosition === ImagePosition.left ? -1 : 1 }}>
              <Box key={imageKey} component="img" src={recipeImageUrl} sx={{ maxWidth: "100%" }} />
            </Box>
          )}
          <Box sx={{ order: 0, flex: "1 1 0", minWidth: 0, p: 1 }}>
            <SectionTitle>
              <MdiIcon path={icons.primary} sx={{ color: "primary.main", mr: 1, verticalAlign: "middle" }} />
              {recipe.name}
            </SectionTitle>
            {recipeYield && (
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 3 }}>
                <div>
                  <MdiIcon path={icons.potSteam} sx={{ mr: 1, verticalAlign: "middle" }} />
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
              <Box sx={{ px: 0, py: 2, fontSize: "0.875rem" }}>
                <SafeMarkdown source={recipe.description} />
              </Box>
            )}
          </Box>
        </Box>
      </section>

      {/* Ingredients */}
      <section>
        <SectionTitle>{t("recipe.ingredients")}</SectionTitle>
        {ingredientSections.map((ingredientSection, sectionIndex) => (
          <div key={`ingredient-section-${sectionIndex}`} className="print-section">
            {ingredientSection.ingredients[0]?.title && (
              <Box component="h4" className="ingredient-title" sx={{ mt: 1 }}>
                {ingredientSection.ingredients[0].title}
              </Box>
            )}
            <Box
              sx={{
                display: "grid",
                gridAutoFlow: "column",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.5rem",
                gridTemplateRows: `repeat(${Math.ceil(ingredientSection.ingredients.length / 2)}, min-content)`,
              }}
            >
              {ingredientSection.ingredients.map((ingredient, ingredientIndex) => (
                <div key={`ingredient-${ingredientIndex}`} className="ingredient-cell">
                  <p className="ingredient-body" dangerouslySetInnerHTML={{ __html: parseText(ingredient) }} />
                  {/* paper has nothing to tap, so what the menu holds on screen is spelled out here */}
                  {preferences.showSubstitutions && substitutionSummary(ingredient) && (
                    <Box className="substitution-body">
                      <SafeMarkdown source={t("recipe.substitutions-with-value", { substitutions: substitutionSummary(ingredient) })} />
                    </Box>
                  )}
                </div>
              ))}
            </Box>
          </div>
        ))}
      </section>

      {/* Instructions */}
      <section>
        {instructionSections.map((instructionSection, sectionIndex) => (
          <div
            key={`instruction-section-${sectionIndex}`}
            className={instructionSection.sectionName ? "print-section" : undefined}
          >
            {!sectionIndex && <SectionTitle>{t("recipe.instructions")}</SectionTitle>}
            {instructionSection.instructions.map((step, stepIndex) => (
              <div key={`instruction-${stepIndex}`}>
                <div className="print-section">
                  {step.title && (
                    <Box component="h4" className="instruction-title" sx={{ mb: 1 }}>
                      {step.title}
                    </Box>
                  )}
                  <h5>
                    {step.summary
                      ? step.summary
                      : t("recipe.step-index", { step: stepIndex + instructionSection.stepOffset + 1 })}
                  </h5>
                  <Box className="recipe-step-body">
                    <SafeMarkdown source={step.text} />
                  </Box>
                  {/* Step Ingredients */}
                  {preferences.showLinkedIngredients && step.ingredientReferences && step.ingredientReferences.length > 0 && (
                    <div className="print-section">
                      <Box component="h6" className="ingredient-title" sx={{ mt: 1, mb: 0 }}>
                        {t("recipe.ingredients")}
                      </Box>
                      <Box
                        sx={{
                          display: "grid",
                          gridAutoFlow: "column",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "0.2rem",
                          gridTemplateRows: `repeat(${Math.ceil(step.ingredientReferences.length / 2)}, min-content)`,
                        }}
                      >
                        {(stepLinkedIngredients.get(`${sectionIndex}-${stepIndex}`) ?? []).map((ingredient, ingredientIndex) => (
                          <p
                            key={`ingredient-${ingredientIndex}`}
                            className="ingredient-body"
                            dangerouslySetInnerHTML={{ __html: parseText(ingredient) }}
                          />
                        ))}
                      </Box>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </section>

      {/* Notes */}
      {preferences.showNotes && (
        <div>
          {hasNotes && <Divider sx={{ my: 2, borderColor: "grey.500" }} />}

          <section>
            {(recipe.notes ?? []).map((note, index) => (
              <div key={`${index}note`}>
                <div className="print-section">
                  <h4>{note.title}</h4>
                  <Box className="note-body">
                    <SafeMarkdown source={note.text} />
                  </Box>
                </div>
              </div>
            ))}
          </section>
        </div>
      )}

      {/* Nutrition */}
      {preferences.showNutrition && (
        <div>
          <SectionTitle>{t("recipe.nutrition")}</SectionTitle>

          <section>
            <div className="print-section">
              <Box
                component="table"
                sx={{
                  "maxWidth": "80%",
                  "borderCollapse": "collapse",
                  "& td": { p: "2px", textAlign: "left", fontSize: 14, verticalAlign: "top" },
                  "& td:first-of-type": { width: "70%", fontWeight: "bold" },
                  "& td:last-of-type": { width: "30%", textAlign: "right" },
                }}
              >
                <tbody>
                  {Object.entries(recipe.nutrition ?? {}).map(([key, value]) => {
                    const label = labels[key];
                    return value && label
                      ? (
                          <tr key={key}>
                            <td>{label.label}</td>
                            <td>{label.suffix ? `${value} ${label.suffix}` : value}</td>
                          </tr>
                        )
                      : null;
                  })}
                </tbody>
              </Box>
            </div>
          </section>
        </div>
      )}
    </Box>
  );
}
