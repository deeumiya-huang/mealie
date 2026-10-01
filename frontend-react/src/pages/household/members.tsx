import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import Link from "@mui/material/Link";
import { BaseContainer } from "~/components/global/BaseContainer";
import { BasePageTitle, BasePageTitleImage } from "~/components/global/BasePageTitle";
import { DataTable } from "~/components/global/DataTable";
import type { DataTableHeader } from "~/components/global/DataTable";
import { I18nT } from "~/components/global/I18nT";
import { UserAvatar } from "~/components/Domain/User/UserAvatar";
import { useUserApi } from "~/hooks/api";
import { useI18n } from "~/hooks/use-global-i18n";
import { useMealieAuth } from "~/hooks/use-mealie-auth";
import { useSeoMeta } from "~/hooks/use-seo-meta";
import type { UserOut } from "~/lib/api/types/user";

type Permission = "canManageHousehold" | "canManage" | "canOrganize" | "canInvite";

export default function HouseholdMembersPage() {
  const api = useUserApi();
  const i18n = useI18n();
  const sessionUser = useMealieAuth().user;

  useSeoMeta({ title: i18n.t("profile.members") });

  const [members, setMembers] = useState<UserOut[]>([]);

  useEffect(() => {
    void api.households.fetchMembers().then(({ data }) => {
      if (data) setMembers(data.items);
    });
  }, [api]);

  async function setPermission(user: UserOut, key: Permission, value: boolean) {
    const updated = { ...user, [key]: value };
    setMembers(prev => prev.map(m => (m.id === user.id ? updated : m)));
    await api.households.setMemberPermissions({
      userId: updated.id,
      canInvite: updated.canInvite,
      canManageHousehold: updated.canManageHousehold,
      canManage: updated.canManage,
      canOrganize: updated.canOrganize,
    });
  }

  const permissionCell = (key: Permission) => (item: UserOut) => (
    <Box sx={{ display: "flex", justifyContent: "center" }}>
      <Checkbox
        checked={!!item[key]}
        disabled={item.id === sessionUser?.id || item.admin}
        onChange={e => void setPermission(item, key, e.target.checked)}
      />
    </Box>
  );

  const headers: DataTableHeader<UserOut>[] = [
    { title: "", key: "avatar", sortable: false, align: "center", render: item => <UserAvatar tooltip={false} userId={item.id} /> },
    { title: i18n.t("user.username"), key: "username" },
    { title: i18n.t("user.full-name"), key: "fullName" },
    { title: i18n.t("user.admin"), key: "admin", render: item => (item.admin ? i18n.t("user.admin") : i18n.t("user.user")) },
    { title: i18n.t("group.manage"), key: "manage", sortable: false, align: "center", render: permissionCell("canManage") },
    { title: i18n.t("settings.organize"), key: "organize", sortable: false, align: "center", render: permissionCell("canOrganize") },
    { title: i18n.t("group.invite"), key: "invite", sortable: false, align: "center", render: permissionCell("canInvite") },
    { title: i18n.t("group.manage-household"), key: "manageHousehold", sortable: false, align: "center", render: permissionCell("canManageHousehold") },
  ];

  return (
    <BaseContainer>
      <BasePageTitle
        divider
        header={<BasePageTitleImage src="/svgs/manage-members.svg" maxWidth={125} maxHeight={125} />}
        title={i18n.t("group.manage-members")}
      >
        <I18nT
          keypath="group.manage-members-description"
          slots={{
            manage: <b>{i18n.t("group.manage")}</b>,
            organize: <b>{i18n.t("settings.organize")}</b>,
            invite: <b>{i18n.t("group.invite")}</b>,
          }}
        />
        <Box sx={{ mt: 0.5, textAlign: "center" }}>
          <Link component={RouterLink} to="/user/profile/edit">{i18n.t("group.looking-to-update-your-profile")}</Link>
        </Box>
      </BasePageTitle>
      <DataTable<UserOut>
        headers={headers}
        items={members}
        itemKey="id"
        elevation={0}
        itemsPerPage={-1}
        hideDefaultFooter
      />
    </BaseContainer>
  );
}
