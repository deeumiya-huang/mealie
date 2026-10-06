// Usage: <RecipeDialogBulkAdd onBulkData={lines => …} ref={handleRef} /> — a "bulk add" button that opens a dialog
// where a block of text is cleaned up with three helpers (trim whitespace, trim first character, split by numbered
// line) and submitted as a list of non-empty lines. `ref` exposes `open()` / `close()` (Vue `defineExpose`).
import { useImperativeHandle, useState, type Ref } from "react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemText from "@mui/material/ListItemText";
import TextField from "@mui/material/TextField";
import { BaseButton } from "@/components/global/BaseButton";
import { BaseDialog } from "@/components/global/BaseDialog";
import { MdiIcon } from "@/components/global/MdiIcon";
import { useI18n } from "@/i18n";
import { icons } from "@/lib/icons";

export interface RecipeDialogBulkAddHandle {
  open: () => void;
  close: () => void;
}

interface RecipeDialogBulkAddProps {
  inputTextProp?: string;
  ref?: Ref<RecipeDialogBulkAddHandle>;
  onBulkData?: (data: string[]) => void;
}

const numberedLineRegex = /\d+[.):] /gm;

function splitText(text: string) {
  return text.split("\n").filter(line => line.trim().length > 0);
}

export function RecipeDialogBulkAdd({ inputTextProp = "", ref, onBulkData }: RecipeDialogBulkAddProps) {
  const { t } = useI18n();
  const [dialog, setDialog] = useState(false);
  const [inputText, setInputText] = useState(inputTextProp);

  useImperativeHandle(ref, () => ({
    open: () => setDialog(true),
    close: () => setDialog(false),
  }), []);

  const canSave = splitText(inputText).length > 0;

  function removeFirstCharacter() {
    setInputText(splitText(inputText)
      .map(line => line.substring(1))
      .join("\n"));
  }

  function splitByNumberedLine() {
    // Split inputText by numberedLineRegex
    const matches = inputText.match(numberedLineRegex);

    let text = inputText;
    matches?.forEach((match, idx) => {
      const replaceText = idx === 0 ? "" : "\n";
      text = text.replace(match, replaceText);
    });
    setInputText(text);
  }

  function trimAllLines() {
    setInputText(splitText(inputText).map(line => line.trim()).join("\n"));
  }

  function save() {
    if (!canSave) {
      return;
    }

    onBulkData?.(splitText(inputText));
    setDialog(false);
  }

  const utilities = [
    {
      id: "trim-whitespace",
      description: t("new-recipe.trim-whitespace-description"),
      action: trimAllLines,
    },
    {
      id: "trim-prefix",
      description: t("new-recipe.trim-prefix-description"),
      action: removeFirstCharacter,
    },
    {
      id: "split-by-numbered-line",
      description: t("new-recipe.split-by-numbered-line-description"),
      action: splitByNumberedLine,
    },
  ];

  return (
    <Box sx={{ textAlign: "center" }}>
      <BaseButton onClick={() => setDialog(true)}>
        {t("new-recipe.bulk-add")}
      </BaseButton>
      <BaseDialog
        open={dialog}
        onOpenChange={setDialog}
        width="800"
        title={t("new-recipe.bulk-add")}
        icon={icons.createAlt}
        submitText={t("general.add")}
        submitDisabled={!canSave}
        disableSubmitOnEnter
        canSubmit
        onSubmit={save}
      >
        <CardContent>
          <TextField
            fullWidth
            multiline
            minRows={12}
            variant="outlined"
            autoFocus
            value={inputText}
            onChange={event => setInputText(event.target.value)}
            placeholder={t("new-recipe.paste-in-your-recipe-data-each-line-will-be-treated-as-an-item-in-a-list")}
          />

          <Divider />
          <List>
            {utilities.map(util => (
              <ListItem key={util.id} sx={{ px: 0 }}>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: "transparent" }}>
                    <IconButton
                      title={t("general.run")}
                      aria-label={t("general.run")}
                      sx={{ bgcolor: "action.selected", color: "info.main" }}
                      onClick={util.action}
                    >
                      <MdiIcon path={icons.play} />
                    </IconButton>
                  </Avatar>
                </ListItemAvatar>
                <ListItemText primary={util.description} slotProps={{ primary: { sx: { whiteSpace: "pre-wrap" } } }} />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </BaseDialog>
    </Box>
  );
}
