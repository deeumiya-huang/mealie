import { useState } from "react";
import Alert from "@mui/material/Alert";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import { icons } from "~/lib/icons";
import type { Parser } from "~/lib/api/user/recipes/recipe";
import { useI18n } from "~/hooks/use-global-i18n";
import { BaseButton } from "~/components/global/BaseButton";
import { BaseDialog } from "~/components/global/BaseDialog";
import { Icon } from "~/components/global/Icon";

export interface ParserOption {
  text: string;
  value: string;
  hide?: boolean;
}

export interface ParseDialogChangeParserProps {
  value: Parser;
  onChange: (parser: Parser) => void;
  availableParsers: ParserOption[];
  showNlpLanguageHint: boolean;
  onParse: () => void;
}

export function ParseDialogChangeParser({ value: currentParser, onChange, availableParsers, showNlpLanguageHint, onParse }: ParseDialogChangeParserProps) {
  const i18n = useI18n();
  const [open, setOpen] = useState(false);
  const currentParserText = currentParser === "brute"
    ? i18n.t("recipe.parser.brute-parser")
    : currentParser === "openai" ? i18n.t("recipe.parser.openai-parser") : i18n.t("recipe.parser.natural-language-processor");

  return (
    <>
      <Card variant="outlined" sx={{ borderColor: "info.main", color: "info.main", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <CardActionArea onClick={onParse}>
          <CardContent>{i18n.t("recipe.parser.try-again-with-parser", { parser: currentParserText })}</CardContent>
        </CardActionArea>
        <CardActions>
          <BaseButton
            edit
            minor
            onClick={(e) => {
              e.stopPropagation();
              setOpen(true);
            }}
          >
            {i18n.t("recipe.parser.select-parser")}
          </BaseButton>
        </CardActions>
      </Card>
      {showNlpLanguageHint && (
        <Alert severity="info" sx={{ mt: 1.5, typography: "body2" }}>{i18n.t("recipe.parser.natural-language-processor-english-only")}</Alert>
      )}
      <BaseDialog open={open} onOpenChange={setOpen} bottomSheet title={i18n.t("recipe.parser.select-parser")} icon={icons.fileSign}>
        <List>
          {availableParsers.filter(({ hide }) => !hide).map(parser => (
            <ListItemButton
              key={parser.value}
              onClick={() => {
                // Changing the parser triggers a re-parse (the Vue watcher emitted "parse" too)
                if (parser.value !== currentParser) onChange(parser.value as Parser);
                onParse();
                setOpen(false);
              }}
            >
              <ListItemText>{parser.text}</ListItemText>
              <Icon path={icons.chevronRight} />
            </ListItemButton>
          ))}
        </List>
      </BaseDialog>
    </>
  );
}

export default ParseDialogChangeParser;
