import { useCallback, useEffect, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { BaseButton } from "~/components/global/BaseButton";
import { BaseContainer } from "~/components/global/BaseContainer";
import { BaseDialog } from "~/components/global/BaseDialog";
import { BasePageTitle, BasePageTitleImage } from "~/components/global/BasePageTitle";
import { Icon } from "~/components/global/Icon";
import { CheckboxInput, SelectInput, TextInput } from "~/components/global/form";
import { useUserApi } from "~/hooks/api";
import { useI18n } from "~/hooks/use-global-i18n";
import { useMealieAuth } from "~/hooks/use-mealie-auth";
import { useRouteQuery } from "~/hooks/use-router";
import { useSeoMeta } from "~/hooks/use-seo-meta";
import { useShoppingListPreferences } from "~/hooks/use-users/preferences";
import type { ShoppingListOut } from "~/lib/api/types/household";
import type { UserOut } from "~/lib/api/types/user";
import { icons } from "~/lib/icons";

export default function ShoppingListsPage() {
  const auth = useMealieAuth();
  const i18n = useI18n();
  const api = useUserApi();
  const navigate = useNavigate();

  useSeoMeta({ title: i18n.t("shopping-list.shopping-list") });

  const [disableRedirectQuery] = useRouteQuery("disableRedirect");
  const [overrideDisableRedirect, setOverrideDisableRedirect] = useState(false);
  const disableRedirect = disableRedirectQuery === "true" || overrideDisableRedirect;
  const [preferences, setPreferences] = useShoppingListPreferences();

  const [shoppingLists, setShoppingLists] = useState<ShoppingListOut[] | null>(null);

  const [createName, setCreateName] = useState("");
  const [createDialog, setCreateDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState("");
  const [ownerDialog, setOwnerDialog] = useState(false);
  const [ownerTarget, setOwnerTarget] = useState<ShoppingListOut | null>(null);
  const isCreateNameValid = createName.trim().length > 0;

  const fetchShoppingLists = useCallback(async () => {
    const { data } = await api.shopping.lists.getAll(1, -1, { orderBy: "name", orderDirection: "asc" });
    return data ? data.items : [];
  }, [api]);

  const refresh = useCallback(async () => {
    setShoppingLists(await fetchShoppingLists());
  }, [fetchShoppingLists]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const shoppingListChoices = (shoppingLists ?? []).filter(
    list => preferences.viewAllLists || list.userId === auth.user?.id,
  );

  // A single list opens straight away, unless the user came back to the overview on purpose
  // (or just changed which lists are shown).
  const shouldRedirect = shoppingLists !== null && !disableRedirect && shoppingListChoices.length === 1;
  const redirectTo = shouldRedirect ? `/shopping-lists/${shoppingListChoices[0]!.id}` : null;
  useEffect(() => {
    if (redirectTo) void navigate(redirectTo);
  }, [redirectTo, navigate]);
  const ready = shoppingLists !== null && !shouldRedirect;

  async function createOne() {
    if (!isCreateNameValid) return;
    const { data } = await api.shopping.lists.createOne({ name: createName.trim() });

    if (data) {
      void refresh();
      setCreateName("");
    }
  }

  // ===============================================================
  // Shopping List Edit User/Owner

  const [allUsers, setAllUsers] = useState<UserOut[]>([]);
  const [updateUserId, setUpdateUserId] = useState<string | undefined>();

  async function fetchAllUsers(target: ShoppingListOut) {
    const { data } = await api.households.fetchMembers();
    if (!data) {
      return;
    }

    setAllUsers([...data.items].sort((a, b) => ((a.fullName || "") < (b.fullName || "") ? -1 : 1)));
    setUpdateUserId(target.userId);
  }

  async function toggleOwnerDialog(list: ShoppingListOut) {
    if (!ownerDialog) {
      setOwnerTarget(list);
      await fetchAllUsers(list);
    }
    setOwnerDialog(!ownerDialog);
  }

  async function updateOwner() {
    if (!ownerTarget || !updateUserId) {
      return;
    }
    // user has not changed, so we should not update
    if (ownerTarget.userId === updateUserId) {
      return;
    }
    // get full list, so the move does not delete shopping list items
    const { data: fullList } = await api.shopping.lists.getOne(ownerTarget.id);
    if (!fullList) {
      return;
    }
    const { data } = await api.shopping.lists.updateOne(ownerTarget.id, { ...fullList, userId: updateUserId });

    if (data) {
      void refresh();
    }
  }

  function openDelete(id: string) {
    setDeleteDialog(true);
    setDeleteTarget(id);
  }

  async function deleteOne() {
    const { data } = await api.shopping.lists.deleteOne(deleteTarget);
    if (data) {
      void refresh();
    }
  }

  if (!ready) return null;

  return (
    <BaseContainer className="narrow-container">
      <BaseDialog
        open={createDialog}
        onOpenChange={setCreateDialog}
        bottomSheet
        title={i18n.t("shopping-list.create-shopping-list")}
        icon={icons.formatListCheck}
        canSubmit
        submitDisabled={!isCreateNameValid}
        onSubmit={() => void createOne()}
      >
        <Box sx={{ p: 2 }}>
          <TextInput
            value={createName}
            onChange={setCreateName}
            autoFocus
            label={i18n.t("shopping-list.new-list")}
          />
        </Box>
      </BaseDialog>

      {/* Settings */}
      <BaseDialog
        open={ownerDialog}
        onOpenChange={setOwnerDialog}
        bottomSheet
        icon={icons.admin}
        title={i18n.t("user.edit-user")}
        canConfirm
        onConfirm={() => void updateOwner()}
      >
        <Box sx={{ p: 2 }}>
          <SelectInput<UserOut, string | undefined>
            value={updateUserId}
            onChange={setUpdateUserId}
            items={allUsers}
            itemTitle="fullName"
            itemValue="id"
            label={i18n.t("general.owner")}
            prependIcon={icons.user}
          />
        </Box>
      </BaseDialog>

      <BaseDialog
        open={deleteDialog}
        onOpenChange={setDeleteDialog}
        bottomSheet
        title={i18n.t("general.confirm")}
        icon={icons.alertCircle}
        color="error"
        canConfirm
        onConfirm={() => void deleteOne()}
      >
        <Box sx={{ p: 2 }}>{i18n.t("shopping-list.are-you-sure-you-want-to-delete-this-item")}</Box>
      </BaseDialog>

      <BasePageTitle
        divider
        header={<BasePageTitleImage src="/svgs/shopping-cart.svg" maxWidth={100} maxHeight={100} />}
        title={i18n.t("shopping-list.shopping-lists")}
      />

      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", pb: 2 }}>
        <CheckboxInput
          checked={preferences.viewAllLists}
          onChange={(viewAllLists) => {
            // changing which lists are shown must not bounce the user into the only list left
            setOverrideDisableRedirect(true);
            setPreferences({ ...preferences, viewAllLists });
          }}
          hideDetails
          label={i18n.t("general.show-all")}
          sx={{ mr: 2 }}
        />
        <BaseButton create onClick={() => setCreateDialog(true)} />
      </Box>

      {!shoppingListChoices.length && (
        <BasePageTitle title={i18n.t("shopping-list.no-shopping-lists-found")} />
      )}

      <section>
        {shoppingListChoices.map(list => (
          <Card key={list.id} className="left-border" sx={{ my: 1 }}>
            <CardActionArea component={RouterLink} to={`/shopping-lists/${list.id}`}>
              <Typography variant="h6" component="div" sx={{ display: "flex", alignItems: "center", px: 2, py: 1 }}>
                <Icon path={icons.cartCheck} sx={{ mr: 1 }} />
                <Box component="span" sx={{ flexGrow: 1 }}>{list.name}</Box>
                <IconButton
                  component="span"
                  aria-label={i18n.t("general.owner")}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    void toggleOwnerDialog(list);
                  }}
                >
                  <Icon path={icons.user} />
                </IconButton>
                <IconButton
                  component="span"
                  aria-label={i18n.t("general.delete")}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openDelete(list.id);
                  }}
                >
                  <Icon path={icons.delete} />
                </IconButton>
              </Typography>
            </CardActionArea>
          </Card>
        ))}
      </section>
    </BaseContainer>
  );
}
