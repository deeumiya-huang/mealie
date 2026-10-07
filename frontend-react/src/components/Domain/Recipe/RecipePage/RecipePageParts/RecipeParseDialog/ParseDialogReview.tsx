// Usage: <ParseDialogReview value={parsedIngs} onChange={setParsedIngs} availableParsers={parsers} parser={parser}
//   showNlpLanguageHint={hint} onParse={parse} onChangeParser={setParser} /> — the last step of the parse dialog: every
// parsed ingredient, editable and reorderable, with its original text. (Vue `v-model` → `value` + `onChange`.)
import { useRef, useState } from "react";
import Box from "@mui/material/Box";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import { RecipeIngredientEditor } from "@/components/Domain/Recipe/RecipeIngredientEditor";
import type { AvailableParser } from "@/hooks/recipes/use-parse-ingredients-dialog";
import { uuid4 } from "@/hooks/use-utils";
import { moveItem, useSortable } from "@/hooks/utils/use-sortable";
import { useI18n } from "@/i18n";
import type { ParsedIngredient } from "@/lib/api/types/recipe";
import type { Parser } from "@/lib/api/user/recipes/recipe";
import { ParseDialogChangeParser } from "./ParseDialogChangeParser";

interface ParseDialogReviewProps {
  availableParsers: AvailableParser[];
  parser: Parser;
  showNlpLanguageHint: boolean;
  value: ParsedIngredient[];
  onChange: (value: ParsedIngredient[]) => void;
  onParse?: () => void;
  onChangeParser?: (parser: Parser) => void;
}

export function ParseDialogReview({ availableParsers, parser, showNlpLanguageHint, value: parsedIngs, onChange, onParse, onChangeParser }: ParseDialogReviewProps) {
  const { t } = useI18n();
  // Vue: reactive({ parser: props.parser }) — a local copy, reported through `changeParser`
  const [stateParser, setStateParser] = useState(parser);

  function insertNewIngredient(index: number) {
    const ing: ParsedIngredient = {
      input: "",
      confidence: {},
      ingredient: {
        quantity: 0,
        referenceId: uuid4(),
      },
    };

    const next = [...parsedIngs];
    next.splice(index, 0, ing);
    onChange(next);
  }

  const listRef = useRef<HTMLDivElement>(null);
  useSortable(listRef, {
    handle: ".handle",
    delay: 250,
    delayOnTouchOnly: true,
    animation: 200,
    group: "recipe-ingredients",
    disabled: false,
    ghostClass: "ghost",
    onReorder: ({ oldIndex, newIndex }) => onChange(moveItem(parsedIngs, oldIndex, newIndex)),
  });

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <ParseDialogChangeParser
        value={stateParser}
        availableParsers={availableParsers}
        showNlpLanguageHint={showNlpLanguageHint}
        onChange={(next) => {
          setStateParser(next);
          onChangeParser?.(next);
        }}
        onParse={() => onParse?.()}
      />
      <div>
        <Typography variant="h6" component="div" sx={{ textAlign: "center", pt: 0, pb: 4 }}>
          {t("recipe.parser.review-parsed-ingredients")}
        </Typography>
        <CardContent>
          <div ref={listRef}>
            {parsedIngs.map((ingredient, index) => (
              <Box key={ingredient.ingredient.referenceId ?? index} sx={{ mb: 2.5 }}>
                <RecipeIngredientEditor
                  value={ingredient.ingredient}
                  onChange={value => onChange(parsedIngs.map((ing, i) => (i === index ? { ...ing, ingredient: value } : ing)))}
                  enableDragHandle
                  enableContextMenu
                  deleteDisabled={parsedIngs.length <= 1}
                  onDelete={() => onChange(parsedIngs.filter((_, i) => i !== index))}
                  onInsertAbove={() => insertNewIngredient(index)}
                  onInsertBelow={() => insertNewIngredient(index + 1)}
                  beforeDivider={ingredient.input
                    ? (
                        <Typography variant="caption" component="p" sx={{ py: 0, my: 0 }}>
                          {t("recipe.original-text-with-value", { originalText: ingredient.input })}
                        </Typography>
                      )
                    : undefined}
                />
              </Box>
            ))}
          </div>
        </CardContent>
      </div>
    </Box>
  );
}
