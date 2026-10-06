import { useEffect, useMemo, useState, type MouseEvent } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Checkbox from "@mui/material/Checkbox";
import Container from "@mui/material/Container";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { Link, useNavigate, useSearchParams } from "react-router";
import { BaseButton } from "@/components/global/BaseButton";
import { BaseDialog } from "@/components/global/BaseDialog";
import { BaseImg } from "@/components/global/BaseImg";
import { BasePageTitle } from "@/components/global/BasePageTitle";
import { MdiIcon } from "@/components/global/MdiIcon";
import { useUserApi } from "@/hooks/api";
import { useMealieAuth } from "@/hooks/use-mealie-auth";
import { useShoppingListPreferences } from "@/hooks/use-users/preferences";
import { useAsyncKey } from "@/hooks/use-utils";
import { useAsyncData, usePageTitle } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import type { ShoppingListOut } from "@/lib/api/types/household";
import type { UserOut } from "@/lib/api/types/user";
import { icons } from "@/lib/icons";

export default function ShoppingListsPage() {
  const auth = useMealieAuth();
  const { t } = useI18n();
  const userApi = useUserApi();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  usePageTitle(t("shopping-list.shopping-list"));

  const [overrideDisableRedirect, setOverrideDisableRedirect] = useState(false);
  const disableRedirect = searchParams.get("disableRedirect") === "true" || overrideDisableRedirect;
  const [preferences, setPreferences] = useShoppingListPreferences();

  const [createName, setCreateName] = useState("");
  const [createDialog, setCreateDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState("");
  const [ownerDialog, setOwnerDialog] = useState(false);
  const [ownerTarget, setOwnerTarget] = useState<ShoppingListOut | null>(null);
  const isCreateNameValid = createName.trim().length > 0;

  async function fetchShoppingLists() {
    const { data } = await userApi.shopping.lists.getAll(1, -1, { orderBy: "name", orderDirection: "asc" });

    if (!data) {
      return [];
    }

    return data.items as ShoppingListOut[];
  }

  // a fresh key per visit, like `useAsyncKey()` in Vue: the lists are always loaded again
  const [asyncKey] = useState(useAsyncKey);
  const { data: shoppingLists, refresh } = useAsyncData(asyncKey, fetchShoppingLists);

  const userId = auth.user?.id;
  const shoppingListChoices = useMemo(() => {
    if (!shoppingLists) {
      return [];
    }

    return shoppingLists.filter(list => preferences.viewAllLists || list.userId === userId);
  }, [shoppingLists, preferences.viewAllLists, userId]);

  // With a single list the page redirects to it, unless redirects were disabled. Until the lists are loaded (and
  // while the redirect is happening) nothing is shown.
  const loaded = shoppingLists !== null;
  const redirectTarget = !disableRedirect && shoppingListChoices.length === 1 ? shoppingListChoices[0]!.id : null;
  const ready = loaded && redirectTarget === null;

  useEffect(() => {
    if (loaded && redirectTarget) {
      void navigate(`/shopping-lists/${redirectTarget}`);
    }
  }, [loaded, redirectTarget, navigate]);

  function setViewAllLists(viewAllLists: boolean) {
    // the override has to be set together with the preference, otherwise the redirect would not be disabled
    setOverrideDisableRedirect(true);
    setPreferences({ ...preferences, viewAllLists });
  }

  async function createOne() {
    if (!isCreateNameValid) return;
    const { data } = await userApi.shopping.lists.createOne({ name: createName.trim() });

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
    const { data } = await userApi.households.fetchMembers();
    if (!data) {
      return;
    }

    // update current user
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
    const { data: fullList } = await userApi.shopping.lists.getOne(ownerTarget.id);
    if (!fullList) {
      return;
    }
    const { data } = await userApi.shopping.lists.updateOne(
      ownerTarget.id,
      { ...fullList, userId: updateUserId },
    );

    if (data) {
      void refresh();
    }
  }

  function openDelete(id: string) {
    setDeleteDialog(true);
    setDeleteTarget(id);
  }

  async function deleteOne() {
    const { data } = await userApi.shopping.lists.deleteOne(deleteTarget);
    if (data) {
      void refresh();
    }
  }

  // the buttons sit inside the card link: they must not follow it (`@click.prevent`)
  function onCardButton(event: MouseEvent, action: () => void) {
    event.preventDefault();
    event.stopPropagation();
    action();
  }

  if (!ready) {
    return null;
  }

  return (
    <Container sx={{ maxWidth: "800px !important" }}>
      <BaseDialog
        open={createDialog}
        onOpenChange={setCreateDialog}
        bottomSheet
        title={t("shopping-list.create-shopping-list")}
        icon={icons.formatListCheck}
        canSubmit
        submitDisabled={!isCreateNameValid}
        onSubmit={() => void createOne()}
      >
        <CardContent>
          <TextField
            value={createName}
            onChange={event => setCreateName(event.target.value)}
            autoFocus
            fullWidth
            label={t("shopping-list.new-list")}
          />
        </CardContent>
      </BaseDialog>

      {/* Settings */}
      <BaseDialog
        open={ownerDialog}
        onOpenChange={setOwnerDialog}
        bottomSheet
        icon={icons.admin}
        title={t("user.edit-user")}
        canConfirm
        onConfirm={() => void updateOwner()}
      >
        <Container>
          <form onSubmit={event => event.preventDefault()}>
            <TextField
              select
              fullWidth
              value={allUsers.some(user => user.id === updateUserId) ? updateUserId : ""}
              onChange={event => setUpdateUserId(event.target.value)}
              label={t("general.owner")}
              slotProps={{
                input: {
                  startAdornment: <MdiIcon path={icons.user} sx={{ mr: 1 }} />,
                },
              }}
            >
              {allUsers.map(user => (
                <MenuItem key={user.id} value={user.id}>
                  {user.fullName}
                </MenuItem>
              ))}
            </TextField>
          </form>
        </Container>
      </BaseDialog>

      <BaseDialog
        open={deleteDialog}
        onOpenChange={setDeleteDialog}
        bottomSheet
        title={t("general.confirm")}
        icon={icons.alertCircle}
        color="error"
        canConfirm
        onConfirm={() => void deleteOne()}
      >
        <CardContent>{t("shopping-list.are-you-sure-you-want-to-delete-this-item")}</CardContent>
      </BaseDialog>
      <BasePageTitle
        divider
        header={<BaseImg width="100%" maxHeight="100px" maxWidth="100px" src="/svgs/shopping-cart.svg" />}
        title={t("shopping-list.shopping-lists")}
      />

      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", pb: 2 }}>
        <FormControlLabel
          sx={{ my: 0, mr: 2 }}
          control={(
            <Checkbox
              checked={preferences.viewAllLists}
              onChange={event => setViewAllLists(event.target.checked)}
            />
          )}
          label={t("general.show-all")}
        />
        <BaseButton create sx={{ my: 0 }} onClick={() => setCreateDialog(true)} />
      </Box>

      {!shoppingListChoices.length && (
        <Container>
          <BasePageTitle title={t("shopping-list.no-shopping-lists-found")} />
        </Container>
      )}

      <section>
        {shoppingListChoices.map(list => (
          <Card
            key={list.id}
            component={Link}
            to={`/shopping-lists/${list.id}`}
            sx={{ my: 1, display: "block", color: "inherit", textDecoration: "none", borderLeft: "5px solid", borderLeftColor: "primary.main" }}
          >
            <Typography
              component="div"
              variant="h6"
              sx={{ display: "flex", alignItems: "center", px: 2, py: 1 }}
            >
              <MdiIcon path={icons.cartCheck} sx={{ mr: 1 }} />
              <Box component="span" sx={{ flexGrow: 1 }}>
                {list.name}
              </Box>
              <IconButton onClick={event => onCardButton(event, () => void toggleOwnerDialog(list))}>
                <MdiIcon path={icons.user} />
              </IconButton>
              <IconButton onClick={event => onCardButton(event, () => openDelete(list.id))}>
                <MdiIcon path={icons.delete} />
              </IconButton>
            </Typography>
          </Card>
        ))}
      </section>
    </Container>
  );
}
