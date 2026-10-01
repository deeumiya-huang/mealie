import { useCallback, useEffect, useState } from "react";
import { Link as RouterLink } from "react-router";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { AppButtonUpload } from "~/components/global/AppButtonUpload";
import { BaseButton } from "~/components/global/BaseButton";
import { BaseCardSectionTitle } from "~/components/global/BaseCardSectionTitle";
import { BaseContainer } from "~/components/global/BaseContainer";
import { BaseDialog } from "~/components/global/BaseDialog";
import { DataTable } from "~/components/global/DataTable";
import type { DataTableHeader } from "~/components/global/DataTable";
import { I18nT } from "~/components/global/I18nT";
import { Icon } from "~/components/global/Icon";
import { CheckboxInput } from "~/components/global/form";
import { useAdminApi } from "~/hooks/api";
import { useI18n } from "~/hooks/use-global-i18n";
import { useSeoMeta } from "~/hooks/use-seo-meta";
import { alert } from "~/hooks/use-toast";
import type { AllBackups, BackupFile } from "~/lib/api/types/admin";
import { icons } from "~/lib/icons";

const backupsFileNameDownload = (fileName: string) => `api/admin/backups/${fileName}`;

export default function AdminBackupsPage() {
  const i18n = useI18n();
  const adminApi = useAdminApi();

  useSeoMeta({ title: i18n.t("sidebar.backups") });

  const [selected, setSelected] = useState("");
  const [backups, setBackups] = useState<AllBackups>({ imports: [], templates: [] });

  const [confirmImport, setConfirmImport] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [importDialog, setImportDialog] = useState(false);
  const [runningBackup, setRunningBackup] = useState(false);
  const [runningRestore, setRunningRestore] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState("");

  const refreshBackups = useCallback(async () => {
    const { data } = await adminApi.backups.getAll();
    if (data) {
      setBackups(data);
    }
  }, [adminApi]);

  useEffect(() => {
    void refreshBackups();
  }, [refreshBackups]);

  async function createBackup() {
    setRunningBackup(true);
    const { data } = await adminApi.backups.create();

    if (data?.error === false) {
      void refreshBackups();
      alert.success(i18n.t("settings.backup.backup-created"));
    }
    else {
      alert.error(i18n.t("settings.backup.error-creating-backup-see-log-file"));
    }

    setRunningBackup(false);
  }

  async function restoreBackup(fileName: string) {
    setRunningRestore(true);
    const { error } = await adminApi.backups.restore(fileName);

    if (error) {
      console.log(error);
      setImportDialog(false);
      setRunningRestore(false);
      alert.error(i18n.t("settings.backup.restore-fail"));
    }
    else {
      alert.success(i18n.t("settings.backup.restore-success"));
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  }

  async function deleteBackup() {
    const { data } = await adminApi.backups.delete(deleteTarget);

    if (!data?.error) {
      alert.success(i18n.t("settings.backup.backup-deleted"));
      void refreshBackups();
    }
  }

  function select(data: { name: string }) {
    if (!data.name) {
      return;
    }
    setSelected(data.name);
  }

  const headers: DataTableHeader<BackupFile>[] = [
    { title: i18n.t("general.name"), key: "name" },
    { title: i18n.t("general.created"), key: "date", render: item => i18n.d(Date.parse(item.date)) },
    { title: i18n.t("export.size"), key: "size" },
    {
      title: "",
      key: "actions",
      align: "end",
      render: item => (
        <Box sx={{ display: "inline-flex", alignItems: "center" }} onClick={e => e.stopPropagation()}>
          <IconButton
            sx={{ mx: 0.5 }}
            color="error"
            onClick={() => {
              setDeleteDialog(true);
              setDeleteTarget(item.name);
            }}
          >
            <Icon path={icons.delete} />
          </IconButton>
          <Box sx={{ mx: 0.5 }}>
            <BaseButton small download downloadUrl={backupsFileNameDownload(item.name)} />
          </Box>
          <BaseButton
            small
            icon={icons.backupRestore}
            sx={{ mx: 0.5 }}
            onClick={() => {
              select(item);
              setImportDialog(true);
            }}
          >
            {i18n.t("settings.backup.backup-restore")}
          </BaseButton>
        </Box>
      ),
    },
  ];

  return (
    <BaseContainer fluid>
      <section>
        {/* Delete Dialog */}
        <BaseDialog
          open={deleteDialog}
          onOpenChange={setDeleteDialog}
          bottomSheet
          title={i18n.t("settings.backup.delete-backup")}
          color="error"
          icon={icons.alertCircle}
          canConfirm
          onConfirm={() => void deleteBackup()}
        >
          <Box sx={{ p: 2 }}>{i18n.t("general.confirm-delete-generic")}</Box>
        </BaseDialog>

        {/* Import Dialog */}
        <BaseDialog
          open={importDialog}
          onOpenChange={setImportDialog}
          bottomSheet
          color="error"
          title={i18n.t("settings.backup.backup-restore")}
          icon={icons.database}
          customCardAction={(
            <BaseButton
              delete
              icon={icons.database}
              disabled={!confirmImport || runningRestore}
              onClick={() => void restoreBackup(selected)}
            >
              {i18n.t("settings.backup.restore-backup")}
            </BaseButton>
          )}
        >
          <Divider />
          <Box sx={{ p: 2 }}>
            <I18nT
              keypath="settings.backup.back-restore-description"
              slots={{ "cannot-be-undone": <b>{` ${i18n.t("settings.backup.cannot-be-undone")} `}</b> }}
            />
            <Box component="p" sx={{ mt: 1.5 }}>
              <I18nT
                keypath="settings.backup.postgresql-note"
                slots={{
                  "backup-restore-process": (
                    <Link href="https://nightly.mealie.io/documentation/getting-started/usage/backups-and-restoring/">
                      {i18n.t("settings.backup.backup-restore-process-in-the-documentation")}
                    </Link>
                  ),
                }}
              />
            </Box>
            <CheckboxInput
              checked={confirmImport}
              onChange={setConfirmImport}
              color="error"
              hideDetails
              label={i18n.t("settings.backup.irreversible-acknowledgment")}
              sx={{ alignItems: "flex-start", mt: 1 }}
            />
          </Box>
          <Typography variant="caption" component="p" sx={{ textAlign: "center", mb: 0.5 }}>
            {selected}
          </Typography>
          {runningRestore && <LinearProgress />}
        </BaseDialog>

        <section>
          <BaseCardSectionTitle title={i18n.t("settings.backup-and-exports")}>
            <Box sx={{ px: 0.5 }}>
              <I18nT keypath="settings.backup.experimental-description" slots={{}} />
            </Box>
          </BaseCardSectionTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 1.5 }}>
            <BaseButton loading={runningBackup} onClick={() => void createBackup()}>
              {i18n.t("settings.backup.create-heading")}
            </BaseButton>
            <AppButtonUpload
              textBtn={false}
              url="/api/admin/backups/upload"
              accept=".zip"
              color="info"
              onUploaded={() => void refreshBackups()}
            />
          </Box>
          <DataTable
            headers={headers}
            items={backups.imports || []}
            itemKey="name"
            elevation={0}
            itemsPerPage={-1}
            hideDefaultFooter
            onRowClick={select}
          />
          <Divider />
        </section>
      </section>
      <Box sx={{ mt: 2, display: "flex", justifyContent: "center", textAlign: "center" }}>
        <Link component={RouterLink} to="/group/migrations">{i18n.t("recipe.looking-for-migrations")}</Link>
      </Box>
    </BaseContainer>
  );
}
