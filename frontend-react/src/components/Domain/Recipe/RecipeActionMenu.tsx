// Usage: <RecipeActionMenu recipe={recipe} slug={slug} name={name} recipeId={id} open={isEditMode} loggedIn canEdit
//   onEdit={…} onSave={…} onDelete={…} onClose={…} onJson={…} onPrint={…} />
// The sticky action bar of the recipe page: favorite, timeline, edit and the recipe context menu while viewing; Delete
// (after a confirmation), JSON, Close and Save while editing. (Vue emitted events by name; here one prop per event.)
import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CardContent from "@mui/material/CardContent";
import IconButton from "@mui/material/IconButton";
import Toolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";
import type { SxProps, Theme } from "@mui/material/styles";
import { BaseDialog } from "@/components/global/BaseDialog";
import { isPaletteColor } from "@/components/global/colors";
import { MdiIcon } from "@/components/global/MdiIcon";
import { useDisplay } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import type { Recipe } from "@/lib/api/types/recipe";
import { icons } from "@/lib/icons";
import { RecipeContextMenu } from "./RecipeContextMenu/RecipeContextMenu";
import { RecipeFavoriteBadge } from "./RecipeFavoriteBadge";
import { RecipeTimelineBadge } from "./RecipeTimelineBadge";

const SAVE_EVENT = "save";
const DELETE_EVENT = "delete";
const CLOSE_EVENT = "close";
const JSON_EVENT = "json";

interface RecipeActionMenuProps {
  recipe: Recipe;
  slug: string;
  recipeScale?: number;
  open: boolean;
  name: string;
  loggedIn?: boolean;
  recipeId: string;
  canEdit?: boolean;
  className?: string;
  sx?: SxProps<Theme>;
  onPrint?: () => void;
  onSave?: () => void;
  onDelete?: () => void;
  onClose?: () => void;
  onJson?: () => void;
  onEdit?: (edit: boolean) => void;
}

export function RecipeActionMenu({
  recipe,
  recipeScale = 1,
  open,
  loggedIn = false,
  canEdit = false,
  className,
  sx,
  onPrint,
  onSave,
  onDelete,
  onClose,
  onJson,
  onEdit,
}: RecipeActionMenuProps) {
  const { t } = useI18n();
  const { xs } = useDisplay();
  const [deleteDialog, setDeleteDialog] = useState(false);

  const editorButtons = [
    {
      text: t("general.delete"),
      icon: icons.delete,
      event: DELETE_EVENT,
      color: "error",
    },
    {
      text: t("general.json"),
      icon: icons.codeBraces,
      event: JSON_EVENT,
      color: "accent",
    },
    {
      text: t("general.close"),
      icon: icons.close,
      event: CLOSE_EVENT,
      color: "",
    },
    {
      text: t("general.save"),
      icon: icons.save,
      event: SAVE_EVENT,
      color: "success",
    },
  ];

  function emitHandler(event: string) {
    switch (event) {
      case CLOSE_EVENT:
        onClose?.();
        break;
      case DELETE_EVENT:
        setDeleteDialog(true);
        break;
      case JSON_EVENT:
        onJson?.();
        break;
      case SAVE_EVENT:
        onSave?.();
        break;
    }
  }

  function emitDelete() {
    onDelete?.();
  }

  return (
    <Toolbar
      variant="dense"
      className={["fixed-bar", className].filter(Boolean).join(" ")}
      sx={[
        {
          position: "sticky",
          top: "4.5em",
          zIndex: 2,
          background: "transparent",
          boxShadow: "none",
          minHeight: "0 !important",
          height: 48,
          px: 1,
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <BaseDialog
        open={deleteDialog}
        onOpenChange={setDeleteDialog}
        bottomSheet
        title={t("recipe.delete-recipe")}
        color="error"
        icon={icons.alertCircle}
        canConfirm
        onConfirm={emitDelete}
      >
        <CardContent>
          {t("recipe.delete-confirmation")}
        </CardContent>
      </BaseDialog>

      <Box sx={{ flexGrow: 1 }} />
      {!open && (
        <Box className="custom-btn-group" sx={{ display: "inline-flex", flex: "0 1 auto", m: 0.5, alignItems: "center" }}>
          {loggedIn && <RecipeFavoriteBadge buttonStyle recipeId={recipe.id!} showAlways />}
          {loggedIn && (
            <RecipeTimelineBadge
              sx={{ ml: 0.5 }}
              buttonStyle
              slug={recipe.slug}
              recipeName={recipe.name!}
            />
          )}
          {loggedIn && (
            <div>
              {canEdit && (
                <Tooltip title={t("general.edit")} placement="bottom">
                  <IconButton
                    size="small"
                    sx={{ "ml": 0.5, "bgcolor": "info.main", "color": "white", "&:hover": { bgcolor: "info.dark" } }}
                    onClick={() => onEdit?.(true)}
                  >
                    <MdiIcon path={icons.edit} size="x-large" />
                  </IconButton>
                </Tooltip>
              )}
            </div>
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
            className="ml-1"
            onPrint={() => onPrint?.()}
          />
        </Box>
      )}
      {open && (
        <Box className="custom-btn-group gapped" sx={{ display: "inline-flex", flex: "0 1 auto", gap: "0.25rem", m: 0.5 }}>
          {editorButtons.map(btn => (xs
            ? (
                <IconButton
                  key={btn.event}
                  size="small"
                  aria-label={btn.text}
                  sx={theme => ({
                    "boxShadow": 2,
                    "bgcolor": isPaletteColor(btn.color) ? theme.palette[btn.color].main : theme.palette.grey[300],
                    "color": isPaletteColor(btn.color) ? theme.palette[btn.color].contrastText : theme.palette.text.primary,
                    "&:hover": { bgcolor: isPaletteColor(btn.color) ? theme.palette[btn.color].dark : theme.palette.grey[400] },
                  })}
                  onClick={() => emitHandler(btn.event)}
                >
                  <MdiIcon path={btn.icon} />
                </IconButton>
              )
            : (
                <Button
                  key={btn.event}
                  variant="contained"
                  color={isPaletteColor(btn.color) ? btn.color : "inherit"}
                  startIcon={<MdiIcon path={btn.icon} />}
                  onClick={() => emitHandler(btn.event)}
                >
                  {btn.text}
                </Button>
              )))}
        </Box>
      )}
    </Toolbar>
  );
}
