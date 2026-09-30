import Box from "@mui/material/Box";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import type { ParsedIngredient } from "~/lib/api/types/recipe";
import type { Parser } from "~/lib/api/user/recipes/recipe";
import { useI18n } from "~/hooks/use-global-i18n";
import { uuid4 } from "~/hooks/use-utils";
import { SortableList } from "~/components/global/SortableList";
import { RecipeIngredientEditor } from "../../../RecipeIngredientEditor";
import { ParseDialogChangeParser } from "./ParseDialogChangeParser";
import type { ParserOption } from "./ParseDialogChangeParser";

export interface ParseDialogReviewProps {
  value: ParsedIngredient[];
  onChange: (value: ParsedIngredient[]) => void;
  availableParsers: ParserOption[];
  parser: Parser;
  showNlpLanguageHint: boolean;
  onParse: () => void;
  onChangeParser: (parser: Parser) => void;
}

// Stable keys for rows (the Vue version keyed by index, which dnd needs to avoid).
const rowIds = new WeakMap<ParsedIngredient, string>();
const rowId = (ing: ParsedIngredient) => {
  if (!rowIds.has(ing)) rowIds.set(ing, uuid4());
  return rowIds.get(ing)!;
};

export function ParseDialogReview({ value: parsedIngs, onChange, availableParsers, parser, showNlpLanguageHint, onParse, onChangeParser }: ParseDialogReviewProps) {
  const i18n = useI18n();

  function insertNewIngredient(index: number) {
    const ing = { input: "", confidence: {}, ingredient: { quantity: 0, referenceId: uuid4() } } as ParsedIngredient;
    const next = [...parsedIngs];
    next.splice(index, 0, ing);
    onChange(next);
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <ParseDialogChangeParser value={parser} onChange={onChangeParser} availableParsers={availableParsers} showNlpLanguageHint={showNlpLanguageHint} onParse={onParse} />
      <div>
        <Typography variant="h6" sx={{ textAlign: "center", pt: 0, pb: 4 }}>{i18n.t("recipe.parser.review-parsed-ingredients")}</Typography>
        <CardContent>
          <SortableList
            items={parsedIngs}
            getId={rowId}
            onReorder={onChange}
            renderItem={(ingredient, index, handle) => (
              <Box sx={{ mb: 2.5 }}>
                <RecipeIngredientEditor
                  value={ingredient.ingredient}
                  onChange={next => onChange(parsedIngs.map((p, i) => (i === index ? Object.assign(p, { ingredient: next }) : p)))}
                  enableDragHandle
                  enableContextMenu
                  dragHandle={handle}
                  deleteDisabled={parsedIngs.length <= 1}
                  onDelete={() => onChange(parsedIngs.filter((_p, i) => i !== index))}
                  onInsertAbove={() => insertNewIngredient(index)}
                  onInsertBelow={() => insertNewIngredient(index + 1)}
                  beforeDivider={ingredient.input
                    ? <Typography variant="caption" component="p" sx={{ py: 0, my: 0 }}>{i18n.t("recipe.original-text-with-value", { originalText: ingredient.input })}</Typography>
                    : undefined}
                />
              </Box>
            )}
          />
        </CardContent>
      </div>
    </Box>
  );
}

export default ParseDialogReview;
