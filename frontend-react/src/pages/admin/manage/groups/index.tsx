import { useState } from "react";
import Box from "@mui/material/Box";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Toolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";
import { useNavigate } from "react-router";
import { AutoForm } from "@/components/global/AutoForm";
import { BaseButton } from "@/components/global/BaseButton";
import { BaseCardSectionTitle } from "@/components/global/BaseCardSectionTitle";
import { BaseDataTable, type DataTableHeader } from "@/components/global/BaseDataTable";
import { BaseDialog } from "@/components/global/BaseDialog";
import { MdiIcon } from "@/components/global/MdiIcon";
import { fieldTypes } from "@/hooks/forms";
import { useGroups } from "@/hooks/use-groups";
import { validators } from "@/hooks/use-validators";
import { usePageTitle } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import type { GroupInDB } from "@/lib/api/types/user";
import { icons } from "@/lib/icons";
import type { AutoFormItems } from "@/types/auto-forms";

export default function AdminManageGroupsPage() {
  const { t } = useI18n();

  usePageTitle(t("group.manage-groups"));

  const navigate = useNavigate();
  const { groups, deleteGroup, createGroup } = useGroups();

  const [createDialog, setCreateDialog] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState("");
  const [createGroupData, setCreateGroupData] = useState({ name: "" });

  const headers: DataTableHeader<GroupInDB>[] = [
    {
      title: t("group.group"),
      align: "start",
      sortable: false,
      key: "id",
    },
    { title: t("general.name"), key: "name" },
    { title: t("group.total-households"), key: "households", value: item => item.households?.length },
    { title: t("user.total-users"), key: "users", value: item => item.users?.length },
    { title: t("general.delete"), key: "actions" },
  ];

  const createGroupItems: AutoFormItems = [
    {
      label: t("group.group-name"),
      varName: "name",
      type: fieldTypes.TEXT,
      rules: [validators.required],
    },
  ];

  function openDialog() {
    setCreateDialog(true);
    setCreateGroupData({ name: "" });
  }

  function handleRowClick(item: GroupInDB) {
    void navigate(`/admin/manage/groups/${item.id}`);
  }

  return (
    <Container maxWidth={false}>
      <BaseDialog
        open={createDialog}
        onOpenChange={setCreateDialog}
        bottomSheet
        title={t("group.create-group")}
        icon={icons.group}
        canSubmit
        onSubmit={() => void createGroup(createGroupData)}
      >
        <CardContent>
          <AutoForm
            value={createGroupData}
            onChange={value => setCreateGroupData(value as typeof createGroupData)}
            updateMode={false}
            items={createGroupItems}
          />
        </CardContent>
      </BaseDialog>

      <BaseDialog
        open={confirmDialog}
        onOpenChange={setConfirmDialog}
        bottomSheet
        title={t("general.confirm")}
        icon={icons.alertCircle}
        color="error"
        canConfirm
        onConfirm={() => void deleteGroup(deleteTarget)}
      >
        <CardContent>
          {t("general.confirm-delete-generic")}
        </CardContent>
      </BaseDialog>

      <BaseCardSectionTitle title={t("group.group-management")} />
      <section>
        <Toolbar sx={{ bgcolor: "transparent", boxShadow: "none", justifyContent: "space-between" }}>
          <BaseButton onClick={openDialog}>
            {t("general.create")}
          </BaseButton>
        </Toolbar>

        <BaseDataTable
          headers={headers}
          items={groups || []}
          itemKey="id"
          elevation={0}
          itemsPerPage={-1}
          hideDefaultFooter
          disablePagination
          onRowClick={handleRowClick}
          slots={{
            households: item => item.households!.length,
            users: item => item.users!.length,
            actions: (item) => {
              const inUse = item.households!.length > 0 || item.users!.length > 0;
              return (
                <Tooltip placement="bottom" title={inUse ? t("admin.group-delete-note") : ""}>
                  <Box component="div" sx={{ display: "inline-block" }}>
                    <IconButton
                      disabled={inUse}
                      color="error"
                      sx={{ mr: 0.5 }}
                      onClick={(event) => {
                        event.stopPropagation();
                        setConfirmDialog(true);
                        setDeleteTarget(item.id);
                      }}
                    >
                      <MdiIcon path={icons.delete} />
                    </IconButton>
                  </Box>
                </Tooltip>
              );
            },
          }}
        />
        <Divider />
      </section>
    </Container>
  );
}
