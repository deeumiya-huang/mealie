import { useState } from "react";
import { useNavigate } from "react-router";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { AutoForm } from "~/components/global/AutoForm";
import { BaseButton } from "~/components/global/BaseButton";
import { BaseCardSectionTitle } from "~/components/global/BaseCardSectionTitle";
import { BaseContainer } from "~/components/global/BaseContainer";
import { BaseDialog } from "~/components/global/BaseDialog";
import { DataTable } from "~/components/global/DataTable";
import type { DataTableHeader } from "~/components/global/DataTable";
import { Icon } from "~/components/global/Icon";
import { fieldTypes } from "~/hooks/forms";
import { useI18n } from "~/hooks/use-global-i18n";
import { useGroups } from "~/hooks/use-groups";
import { useSeoMeta } from "~/hooks/use-seo-meta";
import { validators } from "~/hooks/use-validators";
import type { GroupInDB } from "~/lib/api/types/user";
import { icons } from "~/lib/icons";
import type { AutoFormItems } from "~/types/auto-forms";

export default function AdminManageGroupsPage() {
  const i18n = useI18n();
  const navigate = useNavigate();

  useSeoMeta({ title: i18n.t("group.manage-groups") });

  const { groups, deleteGroup, createGroup } = useGroups();

  const [createDialog, setCreateDialog] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState("");
  const [createGroupData, setCreateGroupData] = useState({ name: "" });

  const createGroupItems: AutoFormItems = [
    {
      label: i18n.t("group.group-name"),
      varName: "name",
      type: fieldTypes.TEXT,
      rules: [validators.required],
    },
  ];

  const headers: DataTableHeader<GroupInDB>[] = [
    { title: i18n.t("group.group"), align: "start", sortable: false, key: "id" },
    { title: i18n.t("general.name"), key: "name" },
    { title: i18n.t("group.total-households"), key: "households", render: item => item.households!.length },
    { title: i18n.t("user.total-users"), key: "users", render: item => item.users!.length },
    {
      title: i18n.t("general.delete"),
      key: "actions",
      render: (item) => {
        const inUse = item.households!.length > 0 || item.users!.length > 0;
        return (
          <Tooltip title={inUse ? i18n.t("admin.group-delete-note") : ""} placement="bottom">
            <span>
              <IconButton
                disabled={inUse}
                sx={{ mr: 0.5 }}
                color="error"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDialog(true);
                  setDeleteTarget(item.id);
                }}
              >
                <Icon path={icons.delete} />
              </IconButton>
            </span>
          </Tooltip>
        );
      },
    },
  ];

  function openDialog() {
    setCreateDialog(true);
    setCreateGroupData({ name: "" });
  }

  return (
    <BaseContainer fluid>
      <BaseDialog
        open={createDialog}
        onOpenChange={setCreateDialog}
        bottomSheet
        title={i18n.t("group.create-group")}
        icon={icons.group}
        canSubmit
        onSubmit={() => void createGroup(createGroupData)}
      >
        <Box sx={{ p: 2 }}>
          <AutoForm value={createGroupData} onChange={setCreateGroupData} items={createGroupItems} />
        </Box>
      </BaseDialog>

      <BaseDialog
        open={confirmDialog}
        onOpenChange={setConfirmDialog}
        bottomSheet
        title={i18n.t("general.confirm")}
        icon={icons.alertCircle}
        color="error"
        canConfirm
        onConfirm={() => void deleteGroup(deleteTarget)}
      >
        <Box sx={{ p: 2 }}>{i18n.t("general.confirm-delete-generic")}</Box>
      </BaseDialog>

      <BaseCardSectionTitle title={i18n.t("group.group-management")} />
      <section>
        <Box sx={{ py: 1.5 }}>
          <BaseButton onClick={openDialog}>{i18n.t("general.create")}</BaseButton>
        </Box>
        <DataTable
          headers={headers}
          items={groups || []}
          itemKey="id"
          elevation={0}
          itemsPerPage={-1}
          hideDefaultFooter
          onRowClick={item => void navigate(`/admin/manage/groups/${item.id}`)}
        />
        <Divider />
      </section>
    </BaseContainer>
  );
}
