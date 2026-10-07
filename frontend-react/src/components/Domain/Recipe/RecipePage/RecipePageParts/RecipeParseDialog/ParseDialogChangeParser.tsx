// Usage: <ParseDialogChangeParser value={parser} onChange={setParser} availableParsers={parsers}
//   showNlpLanguageHint={hint} onParse={parse} /> — "try again with parser X" card of the parse dialog (click to parse
// again) with a button to pick another parser (which parses right away). (Vue `v-model` → `value` + `onChange`.)
import { useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import { BaseButton } from "@/components/global/BaseButton";
import { BaseDialog } from "@/components/global/BaseDialog";
import { MdiIcon } from "@/components/global/MdiIcon";
import type { AvailableParser } from "@/hooks/recipes/use-parse-ingredients-dialog";
import { useI18n } from "@/i18n";
import type { Parser } from "@/lib/api/user/recipes/recipe";
import { icons } from "@/lib/icons";

interface ParseDialogChangeParserProps {
  availableParsers: AvailableParser[];
  showNlpLanguageHint: boolean;
  value?: Parser;
  onChange: (parser: Parser) => void;
  onParse: () => void;
}

export function ParseDialogChangeParser({ availableParsers, showNlpLanguageHint, value: currentParser = "nlp", onChange, onParse }: ParseDialogChangeParserProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  let currentParserText: string;
  switch (currentParser) {
    case "brute":
      currentParserText = t("recipe.parser.brute-parser");
      break;
    case "openai":
      currentParserText = t("recipe.parser.openai-parser");
      break;
    default:
      currentParserText = t("recipe.parser.natural-language-processor");
  }

  function selectParser(parser: Parser) {
    setOpen(false);
    onChange(parser);
    // Vue emitted "parse" on the click and again from watch(currentParser); the second one was ignored while the
    // first was loading, so one parse happens either way
    onParse();
  }

  return (
    <>
      <Card variant="outlined" sx={{ borderColor: "info.main", color: "info.main" }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <CardActionArea onClick={onParse} sx={{ flexGrow: 1 }}>
            <CardContent>
              {t("recipe.parser.try-again-with-parser", { parser: currentParserText })}
            </CardContent>
          </CardActionArea>
          <CardActions>
            <BaseButton
              edit
              minor
              onClick={(event) => {
                event.stopPropagation();
                setOpen(true);
              }}
            >
              {t("recipe.parser.select-parser")}
            </BaseButton>
          </CardActions>
        </Box>
      </Card>
      {showNlpLanguageHint && (
        <Alert severity="info" variant="standard" sx={{ mt: 1.5, typography: "body2", py: 0 }}>
          {t("recipe.parser.natural-language-processor-english-only")}
        </Alert>
      )}
      <BaseDialog
        open={open}
        onOpenChange={setOpen}
        bottomSheet
        title={t("recipe.parser.select-parser")}
        icon={icons.fileSign}
      >
        <List>
          {availableParsers.filter(({ hide }) => !hide).map(parser => (
            <ListItemButton key={parser.value} onClick={() => selectParser(parser.value)}>
              <ListItemText primary={parser.text} />
              <MdiIcon path={icons.chevronRight} />
            </ListItemButton>
          ))}
        </List>
      </BaseDialog>
    </>
  );
}
