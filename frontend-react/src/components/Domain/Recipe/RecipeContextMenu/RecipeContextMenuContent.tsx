// Usage: rendered by RecipeContextMenu inside its popover (loaded on first open): <RecipeContextMenuContent slug name
//   recipeId recipe? recipeScale useItems appendItems leadingItems onClose onDeleted onPrint … />
// The recipe's action list (edit, delete, download, duplicate, add to plan / shopping list, print, print
// preferences, share, the group's recipe actions) plus the dialogs those actions open. Items the caller
// appends/leads with, and the ones this component does not handle itself, are reported through the matching
// `onPrint` / `onMealplanEdit` / `onMealplanRemove` callbacks or `onEvent(event)`.
import { useEffect, useState } from "react";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import MenuList from "@mui/material/MenuList";
import TextField from "@mui/material/TextField";
import type { Theme } from "@mui/material/styles";
import { useNavigate, useParams } from "react-router";
import { BaseDialog } from "@/components/global/BaseDialog";
import { cssColor } from "@/components/global/colors";
import { MdiIcon } from "@/components/global/MdiIcon";
import { MealPlanAddRecipeDialog } from "@/components/Domain/Mealplan/MealPlanAddRecipeDialog";
import { useUserApi } from "@/hooks/api";
import { useDownloader } from "@/hooks/api/use-downloader";
import { useAddToShoppingListDialog } from "@/hooks/shopping-list-page/use-add-to-shopping-list-dialog";
import { useGroupRecipeActions } from "@/hooks/use-group-recipe-actions";
import { useGroupSelf } from "@/hooks/use-groups";
import { useHouseholdSelf } from "@/hooks/use-households";
import { useLoggedInState } from "@/hooks/use-logged-in-state";
import { useMealieAuth } from "@/hooks/use-mealie-auth";
import { alert } from "@/hooks/use-toast";
import { useClipboard } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import type { GroupRecipeActionOut, HouseholdSummary } from "@/lib/api/types/household";
import type { Recipe } from "@/lib/api/types/recipe";
import { icons } from "@/lib/icons";
import { isRecipeFullyPublic } from "@/lib/recipe/recipe-visibility";
import { RecipeDialogAddToShoppingList } from "../RecipeDialogAddToShoppingList";
import { RecipeDialogPrintPreferences } from "../RecipeDialogPrintPreferences";
import { RecipeDialogShare } from "../RecipeDialogShare";

export interface ContextMenuIncludes {
  delete: boolean;
  edit: boolean;
  download: boolean;
  duplicate: boolean;
  mealplanner: boolean;
  shoppingList: boolean;
  print: boolean;
  printPreferences: boolean;
  share: boolean;
  recipeActions: boolean;
}

export interface ContextMenuItem {
  title: string;
  icon: string;
  color?: string | undefined;
  event: string;
  isPublic: boolean;
}

export interface RecipeContextMenuContentProps {
  useItems?: Partial<ContextMenuIncludes>;
  appendItems?: ContextMenuItem[];
  leadingItems?: ContextMenuItem[];
  menuTop?: boolean;
  fab?: boolean;
  color?: string;
  slug: string;
  menuIcon?: string | null;
  name: string;
  recipe?: Recipe;
  recipeId: string;
  recipeScale?: number;
  /** Called after an item was picked, so the surrounding menu can close (Vuetify closes on content click). */
  onClose?: () => void;
  onDeleted?: (slug: string) => void;
  onPrint?: () => void;
  onMealplanEdit?: () => void;
  onMealplanRemove?: () => void;
  /** Any other event of a leading/appended item (Vue emitted it by name). */
  onEvent?: (event: string) => void;
}

const DEFAULT_USE_ITEMS: ContextMenuIncludes = {
  delete: true,
  edit: true,
  download: true,
  duplicate: false,
  mealplanner: true,
  shoppingList: true,
  print: true,
  printPreferences: true,
  share: true,
  recipeActions: true,
};

const NO_ITEMS: ContextMenuItem[] = [];

export function RecipeContextMenuContent({
  useItems = DEFAULT_USE_ITEMS,
  appendItems = NO_ITEMS,
  leadingItems = NO_ITEMS,
  slug,
  name,
  recipe,
  recipeId,
  recipeScale = 1,
  onClose,
  onDeleted,
  onPrint,
  onMealplanEdit,
  onMealplanRemove,
  onEvent,
}: RecipeContextMenuContentProps) {
  const api = useUserApi();
  const { t } = useI18n();
  const auth = useMealieAuth();
  const navigate = useNavigate();
  const params = useParams();
  const { open: shoppingListDialog, setOpen: setShoppingListDialog, shoppingLists, getShoppingLists } = useAddToShoppingListDialog();

  const [printPreferencesDialog, setPrintPreferencesDialog] = useState(false);
  const [shareDialog, setShareDialog] = useState(false);
  const [recipeDeleteDialog, setRecipeDeleteDialog] = useState(false);
  const [mealplannerDialog, setMealplannerDialog] = useState(false);
  const [recipeDuplicateDialog, setRecipeDuplicateDialog] = useState(false);
  const [recipeName, setRecipeName] = useState(name);

  const { group, actions: groupActions } = useGroupSelf();
  const { household } = useHouseholdSelf();
  const { isOwnGroup } = useLoggedInState();
  const { copy } = useClipboard();
  const download = useDownloader();
  const groupRecipeActionsStore = useGroupRecipeActions();
  const recipeActions = groupRecipeActionsStore.recipeActions;

  const groupSlug = params.groupSlug || auth.user?.groupSlug || "";

  // the recipe the actions work on: the one handed in, or the one fetched when an action needs it
  const [recipeRef, setRecipeRef] = useState<Recipe | undefined>(recipe);
  const recipeRefWithScale = recipeRef ? { scale: recipeScale, ...recipeRef } : undefined;

  // the recipe may belong to another household in our group, so we can't reuse the current user's
  const [fetchedHousehold, setFetchedHousehold] = useState<HouseholdSummary | undefined>();
  const recipeHouseholdId = recipeRef?.householdId;

  async function resolveRecipeHousehold(householdId: string | undefined): Promise<HouseholdSummary | undefined> {
    if (!householdId || !isOwnGroup) {
      return undefined;
    }
    if (householdId === fetchedHousehold?.id) {
      return fetchedHousehold;
    }
    if (householdId === household?.id) {
      return household;
    }

    const { data } = await api.households.getOne(householdId);
    const fetched = data || undefined;
    setFetchedHousehold(fetched);
    return fetched;
  }

  const recipeHousehold = !recipeHouseholdId || !isOwnGroup
    ? undefined
    : recipeHouseholdId === household?.id
      ? household
      : fetchedHousehold?.id === recipeHouseholdId ? fetchedHousehold : undefined;

  useEffect(() => {
    if (!recipeHouseholdId || !isOwnGroup || recipeHouseholdId === household?.id || recipeHouseholdId === fetchedHousehold?.id) {
      return;
    }
    let active = true;
    void api.households.getOne(recipeHouseholdId).then(({ data }) => {
      if (active) {
        setFetchedHousehold(data || undefined);
      }
    });
    return () => {
      active = false;
    };
  }, [api, recipeHouseholdId, isOwnGroup, household?.id, fetchedHousehold?.id]);

  const isAdminAndNotOwner = !!auth.user?.admin && auth.user.id !== recipeRef?.userId;
  const canDelete = !!(auth.user && recipeRef && (auth.user.admin || auth.user.id === recipeRef.userId));

  // ===========================================================================
  // Sharing

  function getPlainRecipeLink() {
    return `${window.location.origin}/g/${groupSlug}/r/${slug}`;
  }

  async function sharePlainLink() {
    // Web Share API (VueUse `useShare`), else the clipboard
    if (typeof navigator !== "undefined" && "canShare" in navigator) {
      const data = { title: name, url: getPlainRecipeLink() };
      if (navigator.canShare(data)) {
        await navigator.share(data);
      }
      return;
    }
    try {
      await copy(getPlainRecipeLink());
      alert.success(t("recipe-share.recipe-link-copied-message"));
    }
    catch {
      alert.error(t("general.clipboard-copy-failure"));
    }
  }

  // ===========================================================================
  // Context Menu Setup

  const defaultItems: Record<string, ContextMenuItem> = {
    edit: { title: t("general.edit"), icon: icons.edit, color: undefined, event: "edit", isPublic: false },
    delete: { title: t("general.delete"), icon: icons.delete, color: undefined, event: "delete", isPublic: false },
    download: { title: t("general.download"), icon: icons.download, color: undefined, event: "download", isPublic: false },
    duplicate: { title: t("general.duplicate"), icon: icons.duplicate, color: undefined, event: "duplicate", isPublic: false },
    mealplanner: { title: t("recipe.add-to-plan"), icon: icons.calendar, color: undefined, event: "mealplanner", isPublic: false },
    shoppingList: { title: t("recipe.add-to-list"), icon: icons.cartCheck, color: undefined, event: "shoppingList", isPublic: false },
    print: { title: t("general.print"), icon: icons.printer, color: undefined, event: "print", isPublic: true },
    printPreferences: { title: t("general.print-preferences"), icon: icons.printerSettings, color: undefined, event: "printPreferences", isPublic: true },
    share: { title: t("general.share"), icon: icons.shareVariant, color: undefined, event: "share", isPublic: false },
  };

  // Add leading and appending items, then the default items specified in props
  const menuItems: ContextMenuItem[] = [...leadingItems, ...appendItems];
  for (const [key, value] of Object.entries(useItems)) {
    if (!value) continue;

    // Skip delete if not allowed
    if (key === "delete" && !canDelete) continue;

    const item = defaultItems[key];
    if (item && (item.isPublic || isOwnGroup)) {
      menuItems.push(item);
    }
  }

  // ===========================================================================
  // Context Menu Event Handler

  async function refreshRecipe(): Promise<Recipe | undefined> {
    const { data } = await api.recipes.getOne(slug);
    if (data) {
      setRecipeRef(data);
    }
    return data ?? undefined;
  }

  async function executeRecipeAction(action: GroupRecipeActionOut) {
    if (!recipe) return;
    const response = await groupRecipeActionsStore.execute(action, recipe, recipeScale);

    if (action.actionType === "post") {
      if (!response?.error) {
        alert.success(t("events.message-sent"));
      }
      else {
        alert.error(t("events.something-went-wrong"));
      }
    }
  }

  async function deleteRecipe() {
    const { data } = await api.recipes.deleteOne(slug);
    if (data?.slug) {
      void navigate(`/g/${groupSlug}`);
    }
    onDeleted?.(slug);
  }

  async function handleDownloadEvent() {
    const { data: shareToken } = await api.recipes.share.createOne({ recipeId });
    if (!shareToken) {
      console.error("No share token received");
      alert.error(t("events.something-went-wrong"));
      return;
    }

    download(api.recipes.share.getZipRedirectUrl(shareToken.id), `${slug}.zip`);
  }

  async function duplicateRecipe() {
    const { data } = await api.recipes.duplicateOne(slug, recipeName);
    if (data && data.slug) {
      void navigate(`/g/${groupSlug}/r/${data.slug}`);
    }
  }

  // Note: Print is handled as an event in the parent component
  const eventHandlers: Record<string, () => void | Promise<void>> = {
    delete: () => setRecipeDeleteDialog(true),
    edit: () => void navigate(`/g/${groupSlug}/r/${slug}?edit=true`),
    download: handleDownloadEvent,
    duplicate: () => setRecipeDuplicateDialog(true),
    mealplanner: () => setMealplannerDialog(true),
    printPreferences: async () => {
      if (!recipeRef) {
        await refreshRecipe();
      }
      setPrintPreferencesDialog(true);
    },
    shoppingList: async () => {
      const promises: Promise<unknown>[] = [getShoppingLists()];
      if (!recipeRef) {
        promises.push(refreshRecipe());
      }

      await Promise.allSettled(promises);
      setShoppingListDialog(true);
    },
    share: async () => {
      // resolve everything the visibility check needs, so we don't fall back to a
      // share token just because the recipe/group/household hadn't loaded yet
      const currentRecipe = recipeRef ?? await refreshRecipe();
      if (!group) {
        await groupActions.refresh();
      }
      const currentHousehold = await resolveRecipeHousehold(currentRecipe?.householdId);

      // `group` is shared module state: read it again after the refresh
      const currentGroup = group ?? groupActions.get();
      if (isRecipeFullyPublic(currentRecipe, currentGroup, currentHousehold ?? recipeHousehold)) {
        await sharePlainLink();
      }
      else {
        setShareDialog(true);
      }
    },
  };

  function contextMenuEventHandler(eventKey: string) {
    onClose?.();

    const handler = eventHandlers[eventKey];
    if (handler) {
      void handler();
      return;
    }

    switch (eventKey) {
      case "print":
        onPrint?.();
        break;
      case "mealplanEdit":
        onMealplanEdit?.();
        break;
      case "mealplanRemove":
        onMealplanRemove?.();
        break;
      default:
        onEvent?.(eventKey);
    }
  }

  return (
    <>
      <RecipeDialogShare open={shareDialog} onOpenChange={setShareDialog} recipeId={recipeId} name={name} />
      <RecipeDialogPrintPreferences open={printPreferencesDialog} onOpenChange={setPrintPreferencesDialog} recipe={recipeRef} />
      <BaseDialog
        open={recipeDeleteDialog}
        onOpenChange={setRecipeDeleteDialog}
        bottomSheet
        title={t("recipe.delete-recipe")}
        color="error"
        icon={icons.alertCircle}
        canConfirm
        onConfirm={() => void deleteRecipe()}
      >
        <CardContent>
          {isAdminAndNotOwner ? t("recipe.admin-delete-confirmation") : t("recipe.delete-confirmation")}
        </CardContent>
      </BaseDialog>
      <BaseDialog
        open={recipeDuplicateDialog}
        onOpenChange={setRecipeDuplicateDialog}
        bottomSheet
        title={t("recipe.duplicate")}
        color="primary"
        icon={icons.duplicate}
        canConfirm
        onConfirm={() => void duplicateRecipe()}
      >
        <CardContent>
          <TextField
            fullWidth
            variant="standard"
            size="small"
            label={t("recipe.recipe-name")}
            autoFocus
            value={recipeName}
            onChange={event => setRecipeName(event.target.value)}
          />
        </CardContent>
      </BaseDialog>
      <MealPlanAddRecipeDialog open={mealplannerDialog} onOpenChange={setMealplannerDialog} recipeId={recipeId} />
      {shoppingLists && recipeRefWithScale && (
        <RecipeDialogAddToShoppingList
          open={shoppingListDialog}
          onOpenChange={setShoppingListDialog}
          recipes={[recipeRefWithScale]}
          shoppingLists={shoppingLists}
        />
      )}

      <MenuList dense>
        {menuItems.map((item, index) => (
          <MenuItem key={index} onClick={() => contextMenuEventHandler(item.event)}>
            <ListItemIcon>
              <MdiIcon path={item.icon} sx={item.color ? (theme: Theme) => ({ color: cssColor(theme, item.color ?? "") }) : undefined} />
            </ListItemIcon>
            <ListItemText>{item.title}</ListItemText>
          </MenuItem>
        ))}
        {useItems.recipeActions && recipeActions && recipeActions.length > 0 && <Divider />}
        {useItems.recipeActions && recipeActions && recipeActions.map(action => (
          <MenuItem
            key={action.id}
            onClick={() => {
              onClose?.();
              void executeRecipeAction(action);
            }}
          >
            <ListItemIcon>
              <MdiIcon path={icons.linkVariantPlus} />
            </ListItemIcon>
            <ListItemText>{action.title}</ListItemText>
          </MenuItem>
        ))}
      </MenuList>
    </>
  );
}
