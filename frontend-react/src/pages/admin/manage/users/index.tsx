import { useState } from "react";
import { useNavigate } from "react-router";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import { BaseButton } from "~/components/global/BaseButton";
import { BaseCardSectionTitle } from "~/components/global/BaseCardSectionTitle";
import { BaseContainer } from "~/components/global/BaseContainer";
import { BaseDialog } from "~/components/global/BaseDialog";
import { BaseOverflowButton } from "~/components/global/BaseOverflowButton";
import { DataTable } from "~/components/global/DataTable";
import type { DataTableHeader } from "~/components/global/DataTable";
import { Icon } from "~/components/global/Icon";
import { UserInviteDialog } from "~/components/Domain/User/UserInviteDialog";
import { useAdminApi } from "~/hooks/api";
import { useI18n } from "~/hooks/use-global-i18n";
import { useMealieAuth } from "~/hooks/use-mealie-auth";
import { useSeoMeta } from "~/hooks/use-seo-meta";
import { alert } from "~/hooks/use-toast";
import { useAllUsers, useUser } from "~/hooks/use-user";
import { useAppInfo } from "~/lib/app-info";
import type { UserOut } from "~/lib/api/types/user";
import { icons } from "~/lib/icons";

export default function AdminManageUsersPage() {
  const i18n = useI18n();
  const api = useAdminApi();
  const auth = useMealieAuth();
  const appInfo = useAppInfo();
  const navigate = useNavigate();

  useSeoMeta({ title: i18n.t("sidebar.manage-users") });

  const [inviteDialog, setInviteDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState("");

  const isUserOwnAccount = deleteTargetId === auth.user?.id;

  const ACTIONS_OPTIONS = [
    {
      text: i18n.t("user.reset-locked-users"),
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

  const headers: DataTableHeader<UserOut>[] = [
    { title: i18n.t("user.user-id"), align: "start", key: "id" },
    { title: i18n.t("user.username"), key: "username" },
    { title: i18n.t("user.full-name"), key: "fullName" },
    { title: i18n.t("user.email"), key: "email" },
    { title: i18n.t("group.group"), key: "group" },
    { title: i18n.t("household.household"), key: "household" },
    { title: i18n.t("user.auth-method"), key: "authMethod" },
    {
      title: i18n.t("user.admin"),
      key: "admin",
      render: item => (
        <Icon end color={item.admin ? "success" : undefined} path={item.admin ? icons.checkboxMarkedCircle : icons.windowClose} />
      ),
    },
    {
      title: i18n.t("general.delete"),
      key: "actions",
      sortable: false,
      align: "center",
      render: item => (
        <IconButton
          disabled={+item.id === 1}
          color="error"
          onClick={(e) => {
            e.stopPropagation();
            setDeleteDialog(true);
            setDeleteTargetId(item.id);
          }}
        >
          <Icon path={icons.delete} />
        </IconButton>
      ),
    },
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
    <BaseContainer fluid>
      <UserInviteDialog open={inviteDialog} onOpenChange={setInviteDialog} />
      <BaseDialog
        open={deleteDialog}
        onOpenChange={setDeleteDialog}
        bottomSheet
        title={i18n.t("general.confirm")}
        icon={icons.alertCircle}
        color="error"
        canConfirm
        onConfirm={() => deleteUser(deleteTargetId)}
      >
        <Box sx={{ p: 2 }}>
          {isUserOwnAccount && (
            <Alert severity="warning" variant="outlined" sx={{ mb: 1 }}>
              {i18n.t("general.confirm-delete-own-admin-account")}
            </Alert>
          )}
          {i18n.t("general.confirm-delete-generic")}
        </Box>
      </BaseDialog>

      <BaseCardSectionTitle title={i18n.t("user.user-management")} />
      <section>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 1.5 }}>
          <BaseButton to="/admin/manage/users/create">
            {i18n.t("general.create")}
          </BaseButton>
          {appInfo.allowPasswordLogin && (
            <BaseButton color="info" icon={icons.link} onClick={() => setInviteDialog(true)}>
              {i18n.t("group.invite")}
            </BaseButton>
          )}
          <BaseOverflowButton
            mode="event"
            variant="contained"
            items={ACTIONS_OPTIONS}
            onEvent={(event) => {
              if (event === "unlock-all-users") void unlockAllUsers();
            }}
          />
        </Box>
        <DataTable
          headers={headers}
          items={users || []}
          itemKey="id"
          elevation={0}
          itemsPerPage={-1}
          hideDefaultFooter
          onRowClick={item => void navigate(`/admin/manage/users/${item.id}`)}
        />
        <Divider />
      </section>
    </BaseContainer>
  );
}
