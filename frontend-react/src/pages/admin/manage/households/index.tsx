import { useRef, useState } from "react";
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
import { SelectInput, VForm } from "~/components/global/form";
import type { FormHandle } from "~/components/global/form";
import { fieldTypes } from "~/hooks/forms";
import { useI18n } from "~/hooks/use-global-i18n";
import { useGroups } from "~/hooks/use-groups";
import { useAdminHouseholds } from "~/hooks/use-households";
import { useSeoMeta } from "~/hooks/use-seo-meta";
import { validators } from "~/hooks/use-validators";
import type { HouseholdInDB } from "~/lib/api/types/household";
import type { GroupInDB } from "~/lib/api/types/user";
import { icons } from "~/lib/icons";
import type { AutoFormItems } from "~/types/auto-forms";

export default function AdminManageHouseholdsPage() {
  const i18n = useI18n();
  const navigate = useNavigate();

  useSeoMeta({ title: i18n.t("household.manage-households") });

  const { groups } = useGroups();
  const { households, deleteHousehold, createHousehold } = useAdminHouseholds();

  const refNewHouseholdForm = useRef<FormHandle>(null);
  const [createDialog, setCreateDialog] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState("");
  const [createHouseholdData, setCreateHouseholdData] = useState({ groupId: "", name: "" });

  const createHouseholdItems: AutoFormItems = [
    {
      label: i18n.t("household.household-name"),
      varName: "name",
      type: fieldTypes.TEXT,
      rules: [validators.required],
    },
  ];

  const headers: DataTableHeader<HouseholdInDB>[] = [
    { title: i18n.t("household.household"), align: "start", sortable: false, key: "id" },
    { title: i18n.t("general.name"), key: "name" },
    { title: i18n.t("group.group"), key: "group" },
    { title: i18n.t("user.total-users"), key: "users", render: item => item.users?.length },
    {
      title: i18n.t("user.webhooks-enabled"),
      key: "webhookEnable",
      render: item => (item.webhooks!.length > 0 ? i18n.t("general.yes") : i18n.t("general.no")),
    },
    {
      title: i18n.t("general.delete"),
      key: "actions",
      render: (item) => {
        const inUse = item.users!.length > 0;
        return (
          <Tooltip title={inUse ? i18n.t("admin.household-delete-note") : ""} placement="bottom">
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
    setCreateHouseholdData({ groupId: "", name: "" });
  }

  async function handleCreateSubmit() {
    if (!refNewHouseholdForm.current?.validate()) {
      return;
    }

    setCreateDialog(false);
    await createHousehold(createHouseholdData);
  }

  return (
    <BaseContainer fluid>
      <BaseDialog
        open={createDialog}
        onOpenChange={setCreateDialog}
        bottomSheet
        title={i18n.t("household.create-household")}
        icon={icons.household}
        customCardAction={(
          <BaseButton type="submit" onClick={() => void handleCreateSubmit()}>
            {i18n.t("general.create")}
          </BaseButton>
        )}
      >
        <Box sx={{ p: 2 }}>
          <VForm ref={refNewHouseholdForm}>
            <Box
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleCreateSubmit();
                }
              }}
            >
              {groups && (
                <SelectInput<GroupInDB, string>
                  value={createHouseholdData.groupId}
                  onChange={groupId => setCreateHouseholdData({ ...createHouseholdData, groupId })}
                  items={groups}
                  itemTitle="name"
                  itemValue="id"
                  variant="filled"
                  label={i18n.t("household.household-group")}
                  rules={[validators.required]}
                />
              )}
              <AutoForm value={createHouseholdData} onChange={setCreateHouseholdData} items={createHouseholdItems} />
            </Box>
          </VForm>
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
        onConfirm={() => void deleteHousehold(deleteTarget)}
      >
        <Box sx={{ p: 2 }}>{i18n.t("general.confirm-delete-generic")}</Box>
      </BaseDialog>

      <BaseCardSectionTitle title={i18n.t("household.household-management")} />
      <section>
        <Box sx={{ py: 1.5 }}>
          <BaseButton onClick={openDialog}>{i18n.t("general.create")}</BaseButton>
        </Box>
        {households && (
          <DataTable
            headers={headers}
            items={households}
            itemKey="id"
            elevation={0}
            itemsPerPage={-1}
            hideDefaultFooter
            onRowClick={item => void navigate(`/admin/manage/households/${item.id}`)}
          />
        )}
        <Divider />
      </section>
    </BaseContainer>
  );
}
