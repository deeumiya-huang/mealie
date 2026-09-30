import { useEffect } from "react";
import Box from "@mui/material/Box";
import { icons } from "~/lib/icons";
import type { NoUndefinedField } from "~/lib/api/types/non-generated";
import type { RecipeIngredient } from "~/lib/api/types/recipe";
import { ParseStep, useParseIngredientsDialog } from "~/hooks/recipes/use-parse-ingredients-dialog";
import { useI18n } from "~/hooks/use-global-i18n";
import { AppLoader } from "~/components/global/AppLoader";
import { BaseButton } from "~/components/global/BaseButton";
import { BaseDialog } from "~/components/global/BaseDialog";
import { SwipeTransition } from "~/components/global/Transition/SwipeTransition";
import { ParseDialogInfo } from "./ParseDialogInfo";
import { ParseDialogParse } from "./ParseDialogParse";
import { ParseDialogReview } from "./ParseDialogReview";

export interface RecipePageParseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ingredients: NoUndefinedField<RecipeIngredient[]>;
  width?: string;
  onSave: (ingredients: NoUndefinedField<RecipeIngredient[]>) => void;
}

export function RecipePageParseDialog({ open, onOpenChange, ingredients, width, onSave }: RecipePageParseDialogProps) {
  const i18n = useI18n();
  const d = useParseIngredientsDialog(ingredients, ings => onSave(ings as NoUndefinedField<RecipeIngredient[]>));
  const { state } = d;

  useEffect(() => {
    if (open) void d.parseIngredients();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- whenever the dialog opens
  }, [open]);

  let content;
  if (state.step === ParseStep.LOADING) {
    content = <div key="loading"><AppLoader waitingText={i18n.t("recipe.parser.parsing-ingredients")} /></div>;
  }
  else if (state.step === ParseStep.INFO) {
    content = (
      <div key="info">
        <ParseDialogInfo
          value={d.dontShowInfoPage}
          onChange={(v) => {
            d.dontShowInfoPage = v;
          }}
          autoParsed={d.autoParsedIngredientsCount}
          toReview={d.ingredientsToReviewCount}
        />
      </div>
    );
  }
  else if (state.step === ParseStep.PARSE && d.currentIng) {
    content = <div key={d.currentIng.ingredient.referenceId ?? `parse-${state.currentParsedIndex}`}><ParseDialogParse dialogState={d} /></div>;
  }
  else {
    content = (
      <div key="review">
        <ParseDialogReview
          value={d.parsedIngs}
          onChange={(ings) => {
            d.parsedIngs = ings;
            d.notify();
          }}
          availableParsers={d.availableParsers}
          parser={d.parser}
          showNlpLanguageHint={d.showNlpLanguageHint}
          onParse={() => void d.parseIngredients()}
          onChangeParser={(p) => {
            d.parser = p;
          }}
        />
      </div>
    );
  }

  const action = state.step === ParseStep.INFO
    ? <BaseButton color="info" iconRight icon={icons.arrowRightBold} text={i18n.t("general.next")} onClick={() => d.nextStep()} />
    : state.step === ParseStep.PARSE
      ? (
          <BaseButton
            color={d.currentIngShouldDelete ? "error" : "info"}
            icon={d.currentIngShouldDelete ? icons.delete : icons.arrowRightBold}
            iconRight={!d.currentIngShouldDelete}
            text={i18n.t(d.currentIngShouldDelete ? "recipe.parser.delete-item" : "general.next")}
            onClick={() => d.nextIngredient()}
          />
        )
      : state.step === ParseStep.REVIEW
        ? <BaseButton create text={i18n.t("general.save")} icon={icons.save} loading={state.saveLoading} onClick={() => d.saveIngs()} />
        : null;

  return (
    <BaseDialog
      open={open}
      onOpenChange={onOpenChange}
      title={i18n.t("recipe.parse-ingredients")}
      icon={icons.fileSign}
      width={width}
      disableSubmitOnEnter
      customCardAction={state.step !== ParseStep.LOADING ? action : undefined}
    >
      <Box sx={{ p: 1, m: 0 }}>
        <SwipeTransition direction="left">{content}</SwipeTransition>
      </Box>
    </BaseDialog>
  );
}

export default RecipePageParseDialog;
