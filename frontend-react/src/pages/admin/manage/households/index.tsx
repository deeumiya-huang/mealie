import { useState, type KeyboardEvent } from "react";
import Box from "@mui/material/Box";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
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
import { useAdminHouseholds } from "@/hooks/use-households";
import { validators } from "@/hooks/use-validators";
import { field, useFormValidation, usePageTitle } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import type { HouseholdInDB } from "@/lib/api/types/household";
import { icons } from "@/lib/icons";
import type { AutoFormItems } from "@/types/auto-forms";

export default function AdminManageHouseholdsPage() {
  const { t } = useI18n();
  const navigate = useNavigate();

  usePageTitle(t("household.manage-households"));

  const { groups } = useGroups();
  const { households, deleteHousehold, createHousehold } = useAdminHouseholds();

  const [createDialog, setCreateDialog] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState("");

  const headers: DataTableHeader<HouseholdInDB>[] = [
    {
      title: t("household.household"),
      align: "start",
      sortable: false,
      key: "id",
    },
    { title: t("general.name"), key: "name" },
    { title: t("group.group"), key: "group" },
    { title: t("user.total-users"), key: "users", value: item => item.users?.length },
    { title: t("user.webhooks-enabled"), key: "webhookEnable", value: item => item.webhooks!.length > 0 ? t("general.yes") : t("general.no") },
    { title: t("general.delete"), key: "actions" },
  ];

  const createHouseholdItems: AutoFormItems = [
    {
      label: t("household.household-name"),
      varName: "name",
      type: fieldTypes.TEXT,
      rules: [validators.required],
    },
  ];

  const [createHouseholdData, setCreateHouseholdData] = useState({ groupId: "", name: "" });

  const form = useFormValidation({
    groupId: field<string>(createHouseholdData.groupId, groups ? [validators.required] : []),
  });

  function openDialog() {
    setCreateDialog(true);
    setCreateHouseholdData({ groupId: "", name: "" });
    form.resetValidation();
  }

  function handleRowClick(item: HouseholdInDB) {
    void navigate(`/admin/manage/households/${item.id}`);
  }

  async function handleCreateSubmit() {
    if (!form.validate()) {
      return;
    }
    setCreateDialog(false);
    await createHousehold(createHouseholdData);
  }

  return (
    <Container maxWidth={false}>
      <BaseDialog
        open={createDialog}
        onOpenChange={setCreateDialog}
        bottomSheet
        title={t("household.create-household")}
        icon={icons.household}
        disableSubmitOnEnter
        customCardAction={(
          <BaseButton type="submit" onClick={() => void handleCreateSubmit()}>
            {t("general.create")}
          </BaseButton>
        )}
      >
        <CardContent>
          <Box
            onKeyDown={(event: KeyboardEvent) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleCreateSubmit();
              }
            }}
          >
            {groups && (
              <TextField
                select
                fullWidth
                variant="filled"
                label={t("household.household-group")}
                value={createHouseholdData.groupId}
                {...form.fieldProps("groupId")}
                onChange={(event) => {
                  form.touch("groupId");
                  setCreateHouseholdData(current => ({ ...current, groupId: event.target.value }));
                }}
              >
                {groups.map(group => (
                  <MenuItem key={group.id} value={group.id}>
                    {group.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
            <AutoForm
              value={createHouseholdData}
              onChange={value => setCreateHouseholdData(value as typeof createHouseholdData)}
              updateMode={false}
              items={createHouseholdItems}
            />
          </Box>
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
        onConfirm={() => void deleteHousehold(deleteTarget)}
      >
        <CardContent>
          {t("general.confirm-delete-generic")}
        </CardContent>
      </BaseDialog>

      <BaseCardSectionTitle title={t("household.household-management")} />
      <section>
        <Toolbar sx={{ bgcolor: "transparent", boxShadow: "none", justifyContent: "space-between" }}>
          <BaseButton onClick={openDialog}>
            {t("general.create")}
          </BaseButton>
        </Toolbar>

        {households && (
          <BaseDataTable
            headers={headers}
            items={households}
            itemKey="id"
            elevation={0}
            itemsPerPage={-1}
            hideDefaultFooter
            disablePagination
            onRowClick={handleRowClick}
            slots={{
              users: item => item.users?.length,
              group: item => item.group,
              webhookEnable: item => (item.webhooks!.length > 0 ? t("general.yes") : t("general.no")),
              actions: (item) => {
                const hasUsers = item.users!.length > 0;
                return (
                  <Tooltip placement="bottom" title={hasUsers ? t("admin.household-delete-note") : ""}>
                    <Box component="div" sx={{ display: "inline-block" }}>
                      <IconButton
                        disabled={hasUsers}
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
        )}
        <Divider />
      </section>
    </Container>
  );
}
