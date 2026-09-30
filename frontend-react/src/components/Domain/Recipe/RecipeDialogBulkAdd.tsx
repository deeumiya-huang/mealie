import { forwardRef, useImperativeHandle, useState } from "react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import type { SxProps, Theme } from "@mui/material/styles";
import { icons } from "~/lib/icons";
import { useI18n } from "~/hooks/use-global-i18n";
import { BaseButton } from "~/components/global/BaseButton";
import { BaseDialog } from "~/components/global/BaseDialog";
import { Icon } from "~/components/global/Icon";
import { TextInput } from "~/components/global/form";

export interface RecipeDialogBulkAddHandle {
  open: () => void;
  close: () => void;
}

const numberedLineRegex = /\d+[.):] /gm;

export const RecipeDialogBulkAdd = forwardRef<RecipeDialogBulkAddHandle, { inputTextProp?: string; onBulkData?: (data: string[]) => void; sx?: SxProps<Theme> }>(
  function RecipeDialogBulkAdd({ inputTextProp = "", onBulkData, sx }, ref) {
    const i18n = useI18n();
    const [dialog, setDialog] = useState(false);
    const [inputText, setInputText] = useState(inputTextProp);

    useImperativeHandle(ref, () => ({ open: () => setDialog(true), close: () => setDialog(false) }), []);

    const splitText = (text = inputText) => text.split("\n").filter(line => line.trim().length > 0);
    const canSave = splitText().length > 0;

    function splitByNumberedLine() {
      let text = inputText;
      const matches = text.match(numberedLineRegex);
      matches?.forEach((match, idx) => {
        text = text.replace(match, idx === 0 ? "" : "\n");
      });
      setInputText(text);
    }

    const utilities = [
      { id: "trim-whitespace", description: i18n.t("new-recipe.trim-whitespace-description"), action: () => setInputText(splitText().map(l => l.trim()).join("\n")) },
      { id: "trim-prefix", description: i18n.t("new-recipe.trim-prefix-description"), action: () => setInputText(splitText().map(line => line.substring(1)).join("\n")) },
      { id: "split-by-numbered-line", description: i18n.t("new-recipe.split-by-numbered-line-description"), action: splitByNumberedLine },
    ];

    function save() {
      if (!canSave) return;
      onBulkData?.(splitText());
      setDialog(false);
    }

    return (
      <Box sx={[{ textAlign: "center" }, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}>
        <BaseButton onClick={() => setDialog(true)}>{i18n.t("new-recipe.bulk-add")}</BaseButton>
        <BaseDialog
          open={dialog}
          onOpenChange={setDialog}
          width="800"
          title={i18n.t("new-recipe.bulk-add")}
          icon={icons.createAlt}
          submitText={i18n.t("general.add")}
          submitDisabled={!canSave}
          disableSubmitOnEnter
          canSubmit
          onSubmit={save}
        >
          <CardContent>
            <TextInput
              value={inputText}
              onChange={setInputText}
              multiline
              rows={12}
              hideDetails
              autoFocus
              placeholder={i18n.t("new-recipe.paste-in-your-recipe-data-each-line-will-be-treated-as-an-item-in-a-list")}
            />
            <Divider sx={{ mt: 1 }} />
            <List>
              {utilities.map(util => (
                <ListItem key={util.id} sx={{ px: 0 }}>
                  <Avatar sx={{ bgcolor: "transparent", mr: 2 }}>
                    <IconButton title={i18n.t("general.run")} onClick={util.action} sx={{ color: "info.main", bgcolor: "action.hover" }}>
                      <Icon path={icons.play} />
                    </IconButton>
                  </Avatar>
                  <ListItemText primary={util.description} slotProps={{ primary: { sx: { whiteSpace: "pre-wrap" } } }} />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </BaseDialog>
      </Box>
    );
  },
);

export default RecipeDialogBulkAdd;
