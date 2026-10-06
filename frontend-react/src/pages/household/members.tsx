import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import Container from "@mui/material/Container";
import MuiLink from "@mui/material/Link";
import { Link } from "react-router";
import { BaseDataTable, type DataTableHeader } from "@/components/global/BaseDataTable";
import { BaseImg } from "@/components/global/BaseImg";
import { BasePageTitle } from "@/components/global/BasePageTitle";
import { UserAvatar } from "@/components/Domain/User/UserAvatar";
import { useUserApi } from "@/hooks/api";
import { useMealieAuth } from "@/hooks/use-mealie-auth";
import { usePageTitle } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import { I18nT } from "@/i18n/I18nT";
import type { UserOut } from "@/lib/api/types/user";

type PermissionKey = "canManageHousehold" | "canManage" | "canOrganize" | "canInvite";

export default function HouseholdMembersPage() {
  const { t } = useI18n();
  const api = useUserApi();
  const auth = useMealieAuth();
  const sessionUser = auth.user;

  usePageTitle(t("profile.members"));

  const [members, setMembers] = useState<UserOut[]>([]);

  const headers: DataTableHeader<UserOut>[] = [
    { title: "", key: "avatar", sortable: false, align: "center" },
    { title: t("user.username"), key: "username" },
    { title: t("user.full-name"), key: "fullName" },
    { title: t("user.admin"), key: "admin" },
    { title: t("group.manage"), key: "manage", sortable: false, align: "center" },
    { title: t("settings.organize"), key: "organize", sortable: false, align: "center" },
    { title: t("group.invite"), key: "invite", sortable: false, align: "center" },
    { title: t("group.manage-household"), key: "manageHousehold", sortable: false, align: "center" },
  ];

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data } = await api.households.fetchMembers();
      if (active && data) {
        setMembers(data.items);
      }
    })();
    return () => {
      active = false;
    };
  }, [api]);

  async function setPermissions(user: UserOut) {
    const payload = {
      userId: user.id,
      canInvite: user.canInvite,
      canManageHousehold: user.canManageHousehold,
      canManage: user.canManage,
      canOrganize: user.canOrganize,
    };

    await api.households.setMemberPermissions(payload);
  }

  function permissionCell(item: UserOut, key: PermissionKey, label: string) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center" }}>
        <Checkbox
          color="primary"
          checked={!!item[key]}
          disabled={item.id === sessionUser?.id || item.admin}
          slotProps={{ input: { "aria-label": label } }}
          sx={{ maxWidth: 30 }}
          onChange={(event) => {
            const updated = { ...item, [key]: event.target.checked };
            setMembers(current => current.map(member => (member.id === item.id ? updated : member)));
            void setPermissions(updated);
          }}
        />
      </Box>
    );
  }

  return (
    <Container>
      <BasePageTitle
        divider
        header={<BaseImg width="100%" maxHeight={125} maxWidth={125} src="/svgs/manage-members.svg" />}
        title={t("group.manage-members")}
      >
        <I18nT
          keypath="group.manage-members-description"
          slots={{
            manage: <b>{t("group.manage")}</b>,
            organize: <b>{t("settings.organize")}</b>,
            invite: <b>{t("group.invite")}</b>,
          }}
        />
        <Box component="span" sx={{ display: "block", mt: 0.5, px: 0 }}>
          <MuiLink component={Link} to="/user/profile/edit" underline="none" sx={{ textAlign: "center", color: "primary.main" }}>
            {t("group.looking-to-update-your-profile")}
          </MuiLink>
        </Box>
      </BasePageTitle>
      <BaseDataTable
        headers={headers}
        items={members}
        itemKey="id"
        itemsPerPage={-1}
        hideDefaultFooter
        disablePagination
        slots={{
          avatar: item => <UserAvatar tooltip={false} userId={item.id} />,
          admin: item => (item.admin ? t("user.admin") : t("user.user")),
          manageHousehold: item => permissionCell(item, "canManageHousehold", t("group.manage-household")),
          manage: item => permissionCell(item, "canManage", t("group.manage")),
          organize: item => permissionCell(item, "canOrganize", t("settings.organize")),
          invite: item => permissionCell(item, "canInvite", t("group.invite")),
        }}
      />
    </Container>
  );
}
