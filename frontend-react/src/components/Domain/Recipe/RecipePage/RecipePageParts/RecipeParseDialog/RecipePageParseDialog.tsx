// Usage: <RecipePageParseDialog open={isParsing} onOpenChange={toggleIsParsing} ingredients={recipe.recipeIngredient}
//   onSave={ings => …} /> — the "Parse Ingredients" dialog: parses the ingredients when opened, explains the result,
// walks through the ones that need a review, then shows all of them for a last edit before saving.
// (Vue `v-model` → `open` + `onOpenChange`.)
import { useEffect } from "react";
import Box from "@mui/material/Box";
import { AppLoader } from "@/components/global/AppLoader";
import { BaseButton } from "@/components/global/BaseButton";
import { BaseDialog } from "@/components/global/BaseDialog";
import { SwipeTransition } from "@/components/global/Transition/SwipeTransition";
import { ParseStep, useParseIngredientsDialog } from "@/hooks/recipes/use-parse-ingredients-dialog";
import { useI18n } from "@/i18n";
import type { NoUndefinedField } from "@/lib/api/types/non-generated";
import type { RecipeIngredient } from "@/lib/api/types/recipe";
import { icons } from "@/lib/icons";
import { ParseDialogInfo } from "./ParseDialogInfo";
import { ParseDialogParse } from "./ParseDialogParse";
import { ParseDialogReview } from "./ParseDialogReview";

interface RecipePageParseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ingredients: NoUndefinedField<RecipeIngredient[]>;
  /** Dialog width (Vue passed it through `$attrs` to the BaseDialog). */
  width?: string;
  onSave: (value: NoUndefinedField<RecipeIngredient[]>) => void;
}

export function RecipePageParseDialog({ open, onOpenChange, ingredients, width, onSave }: RecipePageParseDialogProps) {
  const { t } = useI18n();
  const dialogState = useParseIngredientsDialog(ingredients, ings => onSave(ings));

  const {
    availableParsers,
    parser,
    showNlpLanguageHint,
    dontShowInfoPage,
    parsedIngs,
    currentIng,
    currentIngShouldDelete,
    state,
    autoParsedIngredientsCount,
    ingredientsToReviewCount,
    nextStep,
    saveIngs,
    nextIngredient,
    parseIngredients,
    setParser,
    setDontShowInfoPage,
    setParsedIngs,
  } = dialogState;

  // Vue: watch(() => props.modelValue, open => open && parseIngredients())
  useEffect(() => {
    if (!open) {
      return;
    }

    void parseIngredients();
  }, [open, parseIngredients]);

  let stepKey: string;
  let stepContent;
  if (state.step === ParseStep.LOADING) {
    stepKey = "loading";
    stepContent = <AppLoader waitingText={t("recipe.parser.parsing-ingredients")} />;
  }
  else if (state.step === ParseStep.INFO) {
    stepKey = "info";
    stepContent = (
      <ParseDialogInfo
        value={dontShowInfoPage}
        onChange={setDontShowInfoPage}
        autoParsed={autoParsedIngredientsCount}
        toReview={ingredientsToReviewCount}
      />
    );
  }
  else if (state.step === ParseStep.PARSE && currentIng) {
    stepKey = `parse-${currentIng.ingredient.referenceId}`;
    stepContent = <ParseDialogParse dialogState={dialogState} />;
  }
  else {
    stepKey = "review";
    stepContent = (
      <ParseDialogReview
        value={parsedIngs}
        onChange={setParsedIngs}
        availableParsers={availableParsers}
        parser={parser}
        showNlpLanguageHint={showNlpLanguageHint}
        onParse={() => void parseIngredients()}
        onChangeParser={setParser}
      />
    );
  }

  let action = null;
  if (state.step === ParseStep.INFO) {
    action = (
      <BaseButton
        key="info"
        color="info"
        iconRight
        icon={icons.arrowRightBold}
        text={t("general.next")}
        onClick={nextStep}
      />
    );
  }
  else if (state.step === ParseStep.PARSE) {
    action = (
      <BaseButton
        key="parse"
        color={currentIngShouldDelete ? "error" : "info"}
        icon={currentIngShouldDelete ? icons.delete : icons.arrowRightBold}
        iconRight={!currentIngShouldDelete}
        text={t(currentIngShouldDelete ? "recipe.parser.delete-item" : "general.next")}
        onClick={nextIngredient}
      />
    );
  }
  else if (state.step === ParseStep.REVIEW) {
    action = (
      <BaseButton
        key="review"
        create
        text={t("general.save")}
        icon={icons.save}
        loading={state.saveLoading}
        onClick={saveIngs}
      />
    );
  }

  return (
    <BaseDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("recipe.parse-ingredients")}
      icon={icons.fileSign}
      width={width}
      disableSubmitOnEnter
      customCardAction={state.step !== ParseStep.LOADING
        ? <SwipeTransition direction="left">{action}</SwipeTransition>
        : undefined}
    >
      <Box sx={{ p: 1, m: 0 }}>
        <SwipeTransition direction="left">
          {/* These wrapping divs appear to be load-bearing in making sure the transition renders correctly */}
          <div key={stepKey}>
            {state.step === ParseStep.LOADING ? <Box sx={{ my: 3 }}>{stepContent}</Box> : stepContent}
          </div>
        </SwipeTransition>
      </Box>
    </BaseDialog>
  );
}
