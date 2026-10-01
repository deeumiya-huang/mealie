import { Fragment, useState } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Divider from "@mui/material/Divider";
import LinearProgress from "@mui/material/LinearProgress";
import ListItem from "@mui/material/ListItem";
import Typography from "@mui/material/Typography";
import { BaseButton } from "~/components/global/BaseButton";
import { BaseCardSectionTitle } from "~/components/global/BaseCardSectionTitle";
import { BaseContainer } from "~/components/global/BaseContainer";
import { BaseDialog } from "~/components/global/BaseDialog";
import { BasePageTitle } from "~/components/global/BasePageTitle";
import { I18nT } from "~/components/global/I18nT";
import { useAdminApi } from "~/hooks/api";
import { useI18n } from "~/hooks/use-global-i18n";
import { useSeoMeta } from "~/hooks/use-seo-meta";
import type { MaintenanceStorageDetails, MaintenanceSummary } from "~/lib/api/types/admin";
import { icons } from "~/lib/icons";

export default function AdminMaintenancePage() {
  const adminApi = useAdminApi();
  const i18n = useI18n();

  useSeoMeta({ title: i18n.t("admin.maintenance.page-title") });

  const [storageDetailsOpen, setStorageDetailsOpen] = useState(false);
  const [fetchingInfo, setFetchingInfo] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // ==========================================================================
  // General Info

  const emptySummary = (): MaintenanceSummary => ({
    dataDirSize: i18n.t("about.unknown-version"),
    cleanableDirs: 0,
    cleanableImages: 0,
  });
  const [infoResults, setInfoResults] = useState<MaintenanceSummary>(emptySummary);

  async function getSummary() {
    setFetchingInfo(true);
    const { data } = await adminApi.maintenance.getInfo();
    setInfoResults(data ?? emptySummary());
    setFetchingInfo(false);
  }

  const info = [
    { name: i18n.t("admin.maintenance.info-description-data-dir-size"), value: infoResults.dataDirSize },
    { name: i18n.t("admin.maintenance.info-description-cleanable-directories"), value: infoResults.cleanableDirs },
    { name: i18n.t("admin.maintenance.info-description-cleanable-images"), value: infoResults.cleanableImages },
  ];

  // ==========================================================================
  // Storage Details

  const storageTitles: Record<string, string> = {
    tempDirSize: i18n.t("admin.maintenance.storage.title-temporary-directory"),
    backupsDirSize: i18n.t("admin.maintenance.storage.title-backups-directory"),
    groupsDirSize: i18n.t("admin.maintenance.storage.title-groups-directory"),
    recipesDirSize: i18n.t("admin.maintenance.storage.title-recipes-directory"),
    userDirSize: i18n.t("admin.maintenance.storage.title-user-directory"),
  };

  function storageDetailsText(key: string) {
    return storageTitles[key] ?? i18n.t("about.unknown-version");
  }

  const [storageDetails, setStorageDetails] = useState<MaintenanceStorageDetails | null>(null);

  async function openDetails() {
    setStorageDetailsOpen(true);
    const { data } = await adminApi.maintenance.getStorageDetails();
    if (data) {
      setStorageDetails(data);
    }
  }

  // ==========================================================================
  // Actions

  async function runAction(action: () => Promise<unknown>) {
    setActionLoading(true);
    await action();
    setActionLoading(false);
  }

  const actions = [
    {
      name: i18n.t("admin.maintenance.action-clean-directories-name"),
      handler: () => runAction(() => adminApi.maintenance.cleanRecipeFolders()),
      subtitle: i18n.t("admin.maintenance.action-clean-directories-description"),
    },
    {
      name: i18n.t("admin.maintenance.action-clean-temporary-files-name"),
      handler: () => runAction(() => adminApi.maintenance.cleanTemp()),
      subtitle: i18n.t("admin.maintenance.action-clean-temporary-files-description"),
    },
    {
      name: i18n.t("admin.maintenance.action-clean-images-name"),
      handler: () => runAction(() => adminApi.maintenance.cleanImages()),
      subtitle: i18n.t("admin.maintenance.action-clean-images-description"),
    },
  ];

  const storageEntries = Object.entries(storageDetails ?? {});

  return (
    <BaseContainer fluid className="narrow-container">
      <BaseDialog
        open={storageDetailsOpen}
        onOpenChange={setStorageDetailsOpen}
        bottomSheet
        title={i18n.t("admin.maintenance.storage-details")}
        icon={icons.folderOutline}
      >
        <Box sx={{ py: 1 }}>
          {storageEntries.map(([key, value], idx) => (
            <Fragment key={`item-${key}`}>
              <ListItem sx={{ display: "block" }}>
                <div>{storageDetailsText(key)}</div>
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: "end" }}>{value}</Typography>
              </ListItem>
              {idx !== 4 && <Divider sx={{ mx: 1 }} />}
            </Fragment>
          ))}
        </Box>
      </BaseDialog>

      <BasePageTitle divider title={i18n.t("admin.maintenance.page-title")} />

      <section>
        <BaseCardSectionTitle icon={icons.wrench} title={i18n.t("admin.maintenance.summary-title")} />
        <Box sx={{ mb: 3, display: "flex", gap: "0.3rem" }}>
          <BaseButton color="info" icon={icons.tools} onClick={() => void getSummary()}>
            {i18n.t("admin.maintenance.button-label-get-summary")}
          </BaseButton>
          <BaseButton color="info" icon={icons.folderOutline} onClick={() => void openDetails()}>
            {i18n.t("admin.maintenance.button-label-open-details")}
          </BaseButton>
        </Box>
        <Card>
          {fetchingInfo && <LinearProgress />}
          {info.map((value, idx) => (
            <Fragment key={`item-${idx}`}>
              <ListItem sx={{ display: "block", py: 1 }}>
                <div>{value.name}</div>
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: "end" }}>{value.value}</Typography>
              </ListItem>
              <Divider sx={{ mx: 1 }} />
            </Fragment>
          ))}
        </Card>
      </section>

      <Box component="section" sx={{ mt: 4 }}>
        <BaseCardSectionTitle icon={icons.wrench} title={i18n.t("admin.mainentance.actions-title")}>
          <I18nT
            keypath="admin.maintenance.actions-description"
            slots={{
              destructive_in_bold: <b>{i18n.t("admin.maintenance.actions-description-destructive")}</b>,
              irreversible_in_bold: <b>{i18n.t("admin.maintenance.actions-description-irreversible")}</b>,
            }}
          />
        </BaseCardSectionTitle>
        <Card elevation={0} sx={{ m: 0 }}>
          {actionLoading && <LinearProgress />}
          {actions.map((action, idx) => (
            <Fragment key={`item-${idx}`}>
              <ListItem
                sx={{ py: 1, px: 0 }}
                secondaryAction={(
                  <BaseButton color="info" icon={icons.robot} onClick={() => void action.handler()}>
                    {i18n.t("general.run")}
                  </BaseButton>
                )}
              >
                <Box sx={{ pr: 12 }}>
                  <div>{action.name}</div>
                  <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "normal", wordWrap: "break-word" }}>
                    {action.subtitle}
                  </Typography>
                </Box>
              </ListItem>
              <Divider sx={{ mx: 1 }} />
            </Fragment>
          ))}
        </Card>
      </Box>
    </BaseContainer>
  );
}
