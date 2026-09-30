import { useCallback, useEffect, useState } from "react";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import { useNavigate, useParams } from "react-router";
import { icons } from "~/lib/icons";
import { copyToClipboard, isClipboardSupported } from "~/lib/clipboard";
import type { GroupRecipeActionOut, HouseholdSummary } from "~/lib/api/types/household";
import type { Recipe } from "~/lib/api/types/recipe";
import type { NoUndefinedField } from "~/lib/api/types/non-generated";
import { isRecipeFullyPublic } from "~/lib/recipe/recipe-visibility";
import { useUserApi } from "~/hooks/api";
import { useDownloader } from "~/hooks/api/use-downloader";
import { useAddToShoppingListDialog } from "~/hooks/shopping-list-page/use-add-to-shopping-list-dialog";
import { useGroupRecipeActions } from "~/hooks/use-group-recipe-actions";
import { useGroupSelf } from "~/hooks/use-groups";
import { useHouseholdSelf } from "~/hooks/use-households";
import { useI18n } from "~/hooks/use-global-i18n";
import { useLoggedInState } from "~/hooks/use-logged-in-state";
import { useMealieAuth } from "~/hooks/use-mealie-auth";
import { alert } from "~/hooks/use-toast";
import { BaseDialog } from "~/components/global/BaseDialog";
import { Icon } from "~/components/global/Icon";
import { TextInput } from "~/components/global/form";
import { MealPlanAddRecipeDialog } from "~/components/Domain/Mealplan/MealPlanAddRecipeDialog";
import { RecipeDialogAddToShoppingList } from "../RecipeDialogAddToShoppingList";
import { RecipeDialogPrintPreferences } from "../RecipeDialogPrintPreferences";
import { RecipeDialogShare } from "../RecipeDialogShare";
import type { ContextMenuIncludes, ContextMenuItem } from "./types";

export interface RecipeContextMenuContentProps {
  useItems: ContextMenuIncludes;
  appendItems?: ContextMenuItem[];
  leadingItems?: ContextMenuItem[];
  slug: string;
  name: string;
  recipe?: Recipe;
  recipeId: string;
  recipeScale?: number;
  /** Called after a menu item was chosen, to close the surrounding menu. */
  onClose: () => void;
  /** Events not handled here (print, custom leading/append items, deleted, mealplan*). */
  onEvent?: (event: string, payload?: unknown) => void;
}

export function RecipeContextMenuContent(props: RecipeContextMenuContentProps) {
  const { useItems, appendItems = [], leadingItems = [], slug, name, recipe, recipeId, recipeScale = 1, onClose, onEvent } = props;
  const api = useUserApi();
  const i18n = useI18n();
  const auth = useMealieAuth();
  const navigate = useNavigate();
  const params = useParams();
  const groupSlug = params.groupSlug || auth.user?.groupSlug || "";
  const { group, actions: groupActions } = useGroupSelf();
  const { household } = useHouseholdSelf();
  const { isOwnGroup } = useLoggedInState();
  const { open: shoppingListDialog, setOpen: setShoppingListDialog, shoppingLists, getShoppingLists } = useAddToShoppingListDialog();
  const download = useDownloader();
  const groupRecipeActionsStore = useGroupRecipeActions();

  const [printPreferencesDialog, setPrintPreferencesDialog] = useState(false);
  const [shareDialog, setShareDialog] = useState(false);
  const [recipeDeleteDialog, setRecipeDeleteDialog] = useState(false);
  const [mealplannerDialog, setMealplannerDialog] = useState(false);
  const [recipeDuplicateDialog, setRecipeDuplicateDialog] = useState(false);
  const [recipeName, setRecipeName] = useState(name);
  const [recipeRef, setRecipeRef] = useState<Recipe | undefined>(recipe);
  // the recipe may belong to another household in our group, so we can't reuse the current user's
  const [recipeHousehold, setRecipeHousehold] = useState<HouseholdSummary | undefined>();

  useEffect(() => {
    setRecipeRef(recipe);
  }, [recipe]);

  const recipeRefWithScale = recipeRef ? { scale: recipeScale, ...recipeRef } : undefined;

  const refreshRecipeHousehold = useCallback(async (): Promise<HouseholdSummary | undefined> => {
    const householdId = recipeRef?.householdId;
    if (!householdId || !isOwnGroup) {
      setRecipeHousehold(undefined);
      return undefined;
    }
    if (householdId === recipeHousehold?.id) return recipeHousehold;
    if (householdId === household?.id) {
      setRecipeHousehold(household);
      return household;
    }
    const { data } = await api.households.getOne(householdId);
    setRecipeHousehold(data || undefined);
    return data || undefined;
  }, [api, household, isOwnGroup, recipeHousehold, recipeRef?.householdId]);

  useEffect(() => {
    void refreshRecipeHousehold();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- watch(() => recipeRef.householdId, …, { immediate: true })
  }, [recipeRef?.householdId]);

  const isAdminAndNotOwner = auth.user?.admin && auth.user?.id !== recipeRef?.userId;
  const canDelete = !!(auth.user && recipeRef && (auth.user.admin || auth.user.id === recipeRef.userId));

  const defaultItems: Record<string, ContextMenuItem> = {
    edit: { title: i18n.t("general.edit"), icon: icons.edit, event: "edit", isPublic: false },
    delete: { title: i18n.t("general.delete"), icon: icons.delete, event: "delete", isPublic: false },
    download: { title: i18n.t("general.download"), icon: icons.download, event: "download", isPublic: false },
    duplicate: { title: i18n.t("general.duplicate"), icon: icons.duplicate, event: "duplicate", isPublic: false },
    mealplanner: { title: i18n.t("recipe.add-to-plan"), icon: icons.calendar, event: "mealplanner", isPublic: false },
    shoppingList: { title: i18n.t("recipe.add-to-list"), icon: icons.cartCheck, event: "shoppingList", isPublic: false },
    print: { title: i18n.t("general.print"), icon: icons.printer, event: "print", isPublic: true },
    printPreferences: { title: i18n.t("general.print-preferences"), icon: icons.printerSettings, event: "printPreferences", isPublic: true },
    share: { title: i18n.t("general.share"), icon: icons.shareVariant, event: "share", isPublic: false },
  };

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

  async function refreshRecipe() {
    const { data } = await api.recipes.getOne(slug);
    if (data) setRecipeRef(data);
    return data ?? undefined;
  }

  const getPlainRecipeLink = () => `${window.location.origin}/g/${groupSlug}/r/${slug}`;

  async function sharePlainLink() {
    if (navigator.share) {
      await navigator.share({ title: name, url: getPlainRecipeLink() }).catch(() => undefined);
      return;
    }
    if (!isClipboardSupported()) {
      alert.error(i18n.t("general.clipboard-not-supported"));
      return;
    }
    const ok = await copyToClipboard(getPlainRecipeLink());
    alert[ok ? "success" : "error"](i18n.t(ok ? "recipe-share.recipe-link-copied-message" : "general.clipboard-copy-failure"));
  }

  async function executeRecipeAction(action: GroupRecipeActionOut) {
    if (!recipe) return;
    const response = await groupRecipeActionsStore.execute(action, recipe, recipeScale);
    if (action.actionType === "post") {
      if (!response?.error) alert.success(i18n.t("events.message-sent"));
      else alert.error(i18n.t("events.something-went-wrong"));
    }
  }

  async function deleteRecipe() {
    const { data } = await api.recipes.deleteOne(slug);
    if (data?.slug) {
      void navigate(`/g/${groupSlug}`);
    }
    onEvent?.("deleted", slug);
  }

  async function handleDownloadEvent() {
    const { data: shareToken } = await api.recipes.share.createOne({ recipeId });
    if (!shareToken) {
      console.error("No share token received");
      alert.error(i18n.t("events.something-went-wrong"));
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
  const eventHandlers: Record<string, () => void | Promise<unknown>> = {
    delete: () => setRecipeDeleteDialog(true),
    edit: () => navigate(`/g/${groupSlug}/r/${slug}` + "?edit=true"),
    download: handleDownloadEvent,
    duplicate: () => setRecipeDuplicateDialog(true),
    mealplanner: () => setMealplannerDialog(true),
    printPreferences: async () => {
      if (!recipeRef) await refreshRecipe();
      setPrintPreferencesDialog(true);
    },
    shoppingList: () => {
      const promises: Promise<unknown>[] = [getShoppingLists()];
      if (!recipeRef) promises.push(refreshRecipe());
      void Promise.allSettled(promises).then(() => setShoppingListDialog(true));
    },
    share: async () => {
      // resolve everything the visibility check needs, so we don't fall back to a share token
      // just because the recipe/group/household hadn't loaded yet
      const current = recipeRef ?? await refreshRecipe();
      if (!group) await groupActions.refresh();
      const hh = await refreshRecipeHousehold();
      if (isRecipeFullyPublic(current, groupActions.get() ?? group, hh)) {
        await sharePlainLink();
      }
      else {
        setShareDialog(true);
      }
    },
  };

  function contextMenuEventHandler(eventKey: string) {
    onClose();
    const handler = eventHandlers[eventKey];
    if (handler) {
      void handler();
      return;
    }
    onEvent?.(eventKey);
  }

  const recipeActions = groupRecipeActionsStore.recipeActions;

  return (
    <>
      {menuItems.map((item, index) => (
        <MenuItem key={index} dense onClick={() => contextMenuEventHandler(item.event)}>
          <ListItemIcon><Icon path={item.icon} color={item.color} fontSize="small" /></ListItemIcon>
          <ListItemText>{item.title}</ListItemText>
        </MenuItem>
      ))}
      {useItems.recipeActions && recipeActions && recipeActions.length > 0 && [
        <Divider key="actions-divider" />,
        ...recipeActions.map((action, index) => (
          <MenuItem
            key={`action-${index}`}
            dense
            onClick={() => {
              onClose();
              void executeRecipeAction(action);
            }}
          >
            <ListItemIcon><Icon path={icons.linkVariantPlus} fontSize="small" /></ListItemIcon>
            <ListItemText>{action.title}</ListItemText>
          </MenuItem>
        )),
      ]}

      <RecipeDialogShare open={shareDialog} onOpenChange={setShareDialog} recipeId={recipeId} name={name} />
      <RecipeDialogPrintPreferences open={printPreferencesDialog} onOpenChange={setPrintPreferencesDialog} recipe={recipeRef as NoUndefinedField<Recipe> | undefined} />
      <BaseDialog
        open={recipeDeleteDialog}
        onOpenChange={setRecipeDeleteDialog}
        bottomSheet
        title={i18n.t("recipe.delete-recipe")}
        color="error"
        icon={icons.alertCircle}
        canConfirm
        onConfirm={() => void deleteRecipe()}
      >
        <CardContent>
          {isAdminAndNotOwner ? i18n.t("recipe.admin-delete-confirmation") : i18n.t("recipe.delete-confirmation")}
        </CardContent>
      </BaseDialog>
      <BaseDialog
        open={recipeDuplicateDialog}
        onOpenChange={setRecipeDuplicateDialog}
        bottomSheet
        title={i18n.t("recipe.duplicate")}
        color="primary"
        icon={icons.duplicate}
        canConfirm
        onConfirm={() => void duplicateRecipe()}
      >
        <CardContent>
          <TextInput value={recipeName} onChange={setRecipeName} density="compact" label={i18n.t("recipe.recipe-name")} autoFocus />
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
    </>
  );
}

export default RecipeContextMenuContent;
