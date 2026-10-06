import { Fragment, useState } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import LinearProgress from "@mui/material/LinearProgress";
import ListItem from "@mui/material/ListItem";
import Typography from "@mui/material/Typography";
import { BaseButton } from "@/components/global/BaseButton";
import { BaseCardSectionTitle } from "@/components/global/BaseCardSectionTitle";
import { BaseDialog } from "@/components/global/BaseDialog";
import { BasePageTitle } from "@/components/global/BasePageTitle";
import { useAdminApi } from "@/hooks/api";
import { usePageTitle } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import { I18nT } from "@/i18n/I18nT";
import type { MaintenanceStorageDetails, MaintenanceSummary } from "@/lib/api/types/admin";
import { icons } from "@/lib/icons";

export default function AdminMaintenancePage() {
  const { t } = useI18n();
  const adminApi = useAdminApi();

  const [storageDetailsOpen, setStorageDetailsOpen] = useState(false);
  const [fetchingInfo, setFetchingInfo] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Set page title
  usePageTitle(t("admin.maintenance.page-title"));

  // ==========================================================================
  // General Info

  const [infoResults, setInfoResults] = useState<MaintenanceSummary>({
    dataDirSize: t("about.unknown-version"),
    cleanableDirs: 0,
    cleanableImages: 0,
  });

  async function getSummary() {
    setFetchingInfo(true);
    const { data } = await adminApi.maintenance.getInfo();

    setInfoResults(data ?? {
      dataDirSize: t("about.unknown-version"),
      cleanableDirs: 0,
      cleanableImages: 0,
    });

    setFetchingInfo(false);
  }

  const info = [
    {
      name: t("admin.maintenance.info-description-data-dir-size"),
      value: infoResults.dataDirSize,
    },
    {
      name: t("admin.maintenance.info-description-cleanable-directories"),
      value: infoResults.cleanableDirs,
    },
    {
      name: t("admin.maintenance.info-description-cleanable-images"),
      value: infoResults.cleanableImages,
    },
  ];

  // ==========================================================================
  // Storage Details

  const storageTitles: Record<string, string> = {
    tempDirSize: t("admin.maintenance.storage.title-temporary-directory"),
    backupsDirSize: t("admin.maintenance.storage.title-backups-directory"),
    groupsDirSize: t("admin.maintenance.storage.title-groups-directory"),
    recipesDirSize: t("admin.maintenance.storage.title-recipes-directory"),
    userDirSize: t("admin.maintenance.storage.title-user-directory"),
  };

  function storageDetailsText(key: string) {
    return storageTitles[key] ?? t("about.unknown-version");
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

  async function handleCleanDirectories() {
    setActionLoading(true);
    await adminApi.maintenance.cleanRecipeFolders();
    setActionLoading(false);
  }

  async function handleCleanImages() {
    setActionLoading(true);
    await adminApi.maintenance.cleanImages();
    setActionLoading(false);
  }

  async function handleCleanTemp() {
    setActionLoading(true);
    await adminApi.maintenance.cleanTemp();
    setActionLoading(false);
  }

  const actions = [
    {
      name: t("admin.maintenance.action-clean-directories-name"),
      handler: handleCleanDirectories,
      subtitle: t("admin.maintenance.action-clean-directories-description"),
    },
    {
      name: t("admin.maintenance.action-clean-temporary-files-name"),
      handler: handleCleanTemp,
      subtitle: t("admin.maintenance.action-clean-temporary-files-description"),
    },
    {
      name: t("admin.maintenance.action-clean-images-name"),
      handler: handleCleanImages,
      subtitle: t("admin.maintenance.action-clean-images-description"),
    },
  ];

  const storageEntries = Object.entries(storageDetails ?? {});

  return (
    <Container maxWidth={false} sx={{ maxWidth: "800px !important" }}>
      <BaseDialog
        open={storageDetailsOpen}
        onOpenChange={setStorageDetailsOpen}
        bottomSheet
        title={t("admin.maintenance.storage-details")}
        icon={icons.folderOutline}
      >
        <Box sx={{ py: 1 }}>
          {storageEntries.map(([key, value], idx) => (
            <Fragment key={`item-${key}`}>
              <ListItem>
                <Box sx={{ width: "100%", display: "flex", flexDirection: "column" }}>
                  <div>{storageDetailsText(key)}</div>
                  <Typography variant="body2" sx={{ textAlign: "end", color: "text.secondary", opacity: 0.8 }}>
                    {value}
                  </Typography>
                </Box>
              </ListItem>
              {idx !== 4 && <Divider sx={{ mx: 1 }} />}
            </Fragment>
          ))}
        </Box>
      </BaseDialog>

      <BasePageTitle divider title={t("admin.maintenance.page-title")} />

      <section>
        <Box sx={{ pb: 0 }}>
          <BaseCardSectionTitle icon={icons.wrench} title={t("admin.maintenance.summary-title")} />
        </Box>
        <Box sx={{ mb: 3, display: "flex", gap: "0.3rem" }}>
          <BaseButton color="info" icon={icons.tools} onClick={() => void getSummary()}>
            {t("admin.maintenance.button-label-get-summary")}
          </BaseButton>
          <BaseButton color="info" icon={icons.folderOutline} onClick={() => void openDetails()}>
            {t("admin.maintenance.button-label-open-details")}
          </BaseButton>
        </Box>
        <Card sx={{ position: "relative", overflow: "hidden" }}>
          {fetchingInfo && <LinearProgress sx={{ position: "absolute", top: 0, left: 0, right: 0 }} />}
          {info.map(value => (
            <Fragment key={value.name}>
              <ListItem>
                <Box sx={{ width: "100%", py: 1, display: "flex", flexDirection: "column" }}>
                  <div>{value.name}</div>
                  <Typography variant="body2" sx={{ textAlign: "end", color: "text.secondary", opacity: 0.8 }}>
                    {value.value}
                  </Typography>
                </Box>
              </ListItem>
              <Divider sx={{ mx: 1 }} />
            </Fragment>
          ))}
        </Card>
      </section>
      <section>
        <Box sx={{ pb: 0, mt: 4 }}>
          <BaseCardSectionTitle icon={icons.wrench} title={t("admin.mainentance.actions-title")}>
            <I18nT
              keypath="admin.maintenance.actions-description"
              slots={{
                destructive_in_bold: <b>{t("admin.maintenance.actions-description-destructive")}</b>,
                irreversible_in_bold: <b>{t("admin.maintenance.actions-description-irreversible")}</b>,
              }}
            />
          </BaseCardSectionTitle>
        </Box>
        <Card elevation={0} sx={{ m: 0, position: "relative", overflow: "hidden" }}>
          {actionLoading && <LinearProgress sx={{ position: "absolute", top: 0, left: 0, right: 0 }} />}
          {actions.map(action => (
            <Fragment key={action.name}>
              <ListItem sx={{ py: 1, px: 0, display: "flex", alignItems: "center" }}>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <div>{action.name}</div>
                  <Typography variant="body2" sx={{ color: "text.secondary", opacity: 0.8, whiteSpace: "normal", wordWrap: "break-word" }}>
                    {action.subtitle}
                  </Typography>
                </Box>
                <BaseButton color="info" icon={icons.robot} onClick={() => void action.handler()}>
                  {t("general.run")}
                </BaseButton>
              </ListItem>
              <Divider sx={{ mx: 1 }} />
            </Fragment>
          ))}
        </Card>
      </section>
    </Container>
  );
}
