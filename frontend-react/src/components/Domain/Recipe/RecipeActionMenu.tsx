import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CardContent from "@mui/material/CardContent";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import type { SxProps, Theme } from "@mui/material/styles";
import { icons } from "~/lib/icons";
import type { Recipe } from "~/lib/api/types/recipe";
import { useDisplay } from "~/hooks/use-display";
import { useI18n } from "~/hooks/use-global-i18n";
import { isThemeColor } from "~/theme/theme";
import { BaseDialog } from "~/components/global/BaseDialog";
import { Icon } from "~/components/global/Icon";
import { RecipeContextMenu } from "./RecipeContextMenu/RecipeContextMenu";
import { RecipeFavoriteBadge } from "./RecipeFavoriteBadge";
import { RecipeTimelineBadge } from "./RecipeTimelineBadge";

export interface RecipeActionMenuProps {
  recipe: Recipe;
  slug: string;
  recipeScale?: number;
  open: boolean;
  name: string;
  loggedIn?: boolean;
  recipeId: string;
  canEdit?: boolean;
  sx?: SxProps<Theme>;
  onPrint?: () => void;
  onSave?: () => void;
  onDelete?: () => void;
  onClose?: () => void;
  onJson?: () => void;
  onEdit?: () => void;
}

/** Sticky toolbar under the recipe header: view actions, or the editor's delete/json/close/save. */
export function RecipeActionMenu(props: RecipeActionMenuProps) {
  const { recipe, recipeScale = 1, open, loggedIn = false, canEdit = false, sx, onPrint, onSave, onDelete, onClose, onJson, onEdit } = props;
  const i18n = useI18n();
  const display = useDisplay();
  const [deleteDialog, setDeleteDialog] = useState(false);

  const editorButtons = [
    { text: i18n.t("general.delete"), icon: icons.delete, event: "delete", color: "error" },
    { text: i18n.t("general.json"), icon: icons.codeBraces, event: "json", color: "accent" },
    { text: i18n.t("general.close"), icon: icons.close, event: "close", color: "" },
    { text: i18n.t("general.save"), icon: icons.save, event: "save", color: "success" },
  ];

  function emitHandler(event: string) {
    switch (event) {
      case "close":
        onClose?.();
        break;
      case "delete":
        setDeleteDialog(true);
        break;
      case "json":
        onJson?.();
        break;
      case "save":
        onSave?.();
        break;
    }
  }

  return (
    <Box
      sx={[
        { position: "sticky", top: "4.5em", zIndex: 2, bgcolor: "transparent", minHeight: 0, height: 48, px: 1, display: "flex", alignItems: "center" },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      <BaseDialog
        open={deleteDialog}
        onOpenChange={setDeleteDialog}
        bottomSheet
        title={i18n.t("recipe.delete-recipe")}
        color="error"
        icon={icons.alertCircle}
        canConfirm
        onConfirm={() => onDelete?.()}
      >
        <CardContent>{i18n.t("recipe.delete-confirmation")}</CardContent>
      </BaseDialog>

      <Box sx={{ flex: 1 }} />
      {!open && (
        <Box sx={{ display: "inline-flex", alignItems: "center", m: 0.5, gap: 0.5 }}>
          {loggedIn && <RecipeFavoriteBadge buttonStyle recipeId={recipe.id!} showAlways />}
          {loggedIn && <RecipeTimelineBadge buttonStyle slug={recipe.slug ?? ""} recipeName={recipe.name!} />}
          {loggedIn && canEdit && (
            <Tooltip title={i18n.t("general.edit")} placement="bottom">
              <IconButton size="small" onClick={() => onEdit?.()} sx={{ "bgcolor": "info.main", "color": "#fff", "&:hover": { bgcolor: "info.dark" } }}>
                <Icon path={icons.edit} size="x-large" />
              </IconButton>
            </Tooltip>
          )}
          <RecipeContextMenu
            menuTop={false}
            name={recipe.name!}
            slug={recipe.slug!}
            menuIcon={icons.dotsVertical}
            fab
            color="info"
            recipe={recipe}
            recipeId={recipe.id!}
            recipeScale={recipeScale}
            useItems={{
              edit: false,
              download: loggedIn,
              duplicate: loggedIn,
              mealplanner: loggedIn,
              shoppingList: loggedIn,
              print: true,
              printPreferences: true,
              share: loggedIn,
              recipeActions: true,
              delete: loggedIn,
            }}
            onPrint={onPrint}
          />
        </Box>
      )}
      {open && (
        <Box sx={{ display: "inline-flex", m: 0.5, gap: 0.5 }}>
          {editorButtons.map(btn => display.xs
            ? (
                <IconButton
                  key={btn.event}
                  size="small"
                  onClick={() => emitHandler(btn.event)}
                  sx={isThemeColor(btn.color) ? { "bgcolor": `${btn.color}.main`, "color": "#fff", "&:hover": { bgcolor: `${btn.color}.dark` } } : { bgcolor: "action.selected" }}
                >
                  <Icon path={btn.icon} />
                </IconButton>
              )
            : (
                <Button
                  key={btn.event}
                  variant="contained"
                  color={isThemeColor(btn.color) ? btn.color : "inherit"}
                  onClick={() => emitHandler(btn.event)}
                  startIcon={<Icon path={btn.icon} />}
                >
                  {btn.text}
                </Button>
              ))}
        </Box>
      )}
    </Box>
  );
}

export default RecipeActionMenu;
