import { useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Toolbar from "@mui/material/Toolbar";
import { useNavigate } from "react-router";
import { BaseButton } from "@/components/global/BaseButton";
import { BaseCardSectionTitle } from "@/components/global/BaseCardSectionTitle";
import { BaseDataTable, type DataTableHeader } from "@/components/global/BaseDataTable";
import { BaseDialog } from "@/components/global/BaseDialog";
import { BaseOverflowButton, type MenuItemSpec } from "@/components/global/BaseOverflowButton";
import { MdiIcon } from "@/components/global/MdiIcon";
import { UserInviteDialog } from "@/components/Domain/User/UserInviteDialog";
import { useAdminApi } from "@/hooks/api";
import { useMealieAuth } from "@/hooks/use-mealie-auth";
import { alert } from "@/hooks/use-toast";
import { useAllUsers, useUser } from "@/hooks/use-user";
import { usePageTitle } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import type { UserOut } from "@/lib/api/types/user";
import { icons } from "@/lib/icons";
import { useAppInfo } from "@/providers/app-info";

export default function AdminManageUsersPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const api = useAdminApi();
  const auth = useMealieAuth();
  const appInfo = useAppInfo();

  usePageTitle(t("sidebar.manage-users"));

  const [inviteDialog, setInviteDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState("");

  const user = auth.user;
  const isUserOwnAccount = deleteTargetId === user?.id;

  const ACTIONS_OPTIONS: MenuItemSpec[] = [
    {
      text: t("user.reset-locked-users"),
      icon: icons.lock,
      event: "unlock-all-users",
    },
  ];

  const { users, refreshAllUsers } = useAllUsers();
  const { deleteUser: deleteUserMixin } = useUser(refreshAllUsers);

  function deleteUser(id: string) {
    void deleteUserMixin(id);

    if (isUserOwnAccount) {
      void auth.getSession();
    }
  }

  function handleRowClick(item: UserOut) {
    void navigate(`/admin/manage/users/${item.id}`);
  }

  const headers: DataTableHeader<UserOut>[] = [
    { title: t("user.user-id"), align: "start", key: "id" },
    { title: t("user.username"), key: "username" },
    { title: t("user.full-name"), key: "fullName" },
    { title: t("user.email"), key: "email" },
    { title: t("group.group"), key: "group" },
    { title: t("household.household"), key: "household" },
    { title: t("user.auth-method"), key: "authMethod" },
    { title: t("user.admin"), key: "admin" },
    { title: t("general.delete"), key: "actions", sortable: false, align: "center" },
  ];

  async function unlockAllUsers(): Promise<void> {
    const { data } = await api.users.unlockAllUsers(true);

    if (data) {
      const unlocked = data.unlocked ?? 0;

      alert.success(`${unlocked} user(s) unlocked`);
      void refreshAllUsers();
    }
  }

  return (
    <Container maxWidth={false}>
      <UserInviteDialog open={inviteDialog} onOpenChange={setInviteDialog} />
      <BaseDialog
        open={deleteDialog}
        onOpenChange={setDeleteDialog}
        bottomSheet
        title={t("general.confirm")}
        icon={icons.alertCircle}
        color="error"
        canConfirm
        onConfirm={() => deleteUser(deleteTargetId)}
      >
        <CardContent>
          {isUserOwnAccount && (
            <Alert severity="warning" variant="outlined">
              {t("general.confirm-delete-own-admin-account")}
            </Alert>
          )}
          {t("general.confirm-delete-generic")}
        </CardContent>
      </BaseDialog>

      <BaseCardSectionTitle title={t("user.user-management")} />
      <section>
        <Toolbar sx={{ bgcolor: "transparent", boxShadow: "none", justifyContent: "space-between" }}>
          <BaseButton to="/admin/manage/users/create" sx={{ mr: 1 }}>
            {t("general.create")}
          </BaseButton>
          {appInfo.allowPasswordLogin && (
            <BaseButton sx={{ mr: 1 }} color="info" icon={icons.link} onClick={() => setInviteDialog(true)}>
              {t("group.invite")}
            </BaseButton>
          )}

          <Box sx={{ flexGrow: 1 }} />
          <BaseOverflowButton
            mode="event"
            variant="contained"
            items={ACTIONS_OPTIONS}
            onAction={(event) => {
              if (event === "unlock-all-users") {
                void unlockAllUsers();
              }
            }}
          />
        </Toolbar>
        <BaseDataTable
          headers={headers}
          items={users || []}
          itemKey="id"
          elevation={0}
          itemsPerPage={-1}
          hideDefaultFooter
          disablePagination
          onRowClick={handleRowClick}
          slots={{
            admin: item => (
              <MdiIcon
                color={item.admin ? "success" : undefined}
                path={item.admin ? icons.checkboxMarkedCircle : icons.windowClose}
              />
            ),
            actions: item => (
              <IconButton
                color="error"
                disabled={+item.id === 1}
                onClick={(event) => {
                  event.stopPropagation();
                  setDeleteDialog(true);
                  setDeleteTargetId(item.id);
                }}
              >
                <MdiIcon path={icons.delete} />
              </IconButton>
            ),
          }}
        />
        <Divider />
      </section>
    </Container>
  );
}
