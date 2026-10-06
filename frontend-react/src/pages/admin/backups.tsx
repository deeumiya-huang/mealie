import { useCallback, useEffect, useState } from "react";
import Box from "@mui/material/Box";
import CardContent from "@mui/material/CardContent";
import Checkbox from "@mui/material/Checkbox";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { Link } from "react-router";
import { AppButtonUpload } from "@/components/global/AppButtonUpload";
import { BaseButton } from "@/components/global/BaseButton";
import { BaseCardSectionTitle } from "@/components/global/BaseCardSectionTitle";
import { BaseDataTable, type DataTableHeader } from "@/components/global/BaseDataTable";
import { BaseDialog } from "@/components/global/BaseDialog";
import { MdiIcon } from "@/components/global/MdiIcon";
import { useAdminApi } from "@/hooks/api";
import { alert } from "@/hooks/use-toast";
import { usePageTitle } from "@/hooks/utils";
import { I18nT } from "@/i18n/I18nT";
import { useI18n } from "@/i18n";
import type { AllBackups, BackupFile } from "@/lib/api/types/admin";
import { icons } from "@/lib/icons";

const backupsFileNameDownload = (fileName: string) => `api/admin/backups/${fileName}`;

export default function AdminBackupsPage() {
  const { t, d } = useI18n();
  const adminApi = useAdminApi();

  usePageTitle(t("sidebar.backups"));

  const [selected, setSelected] = useState("");
  const [backups, setBackups] = useState<AllBackups>({
    imports: [],
    templates: [],
  });
  const [deleteTarget, setDeleteTarget] = useState("");

  const [confirmImport, setConfirmImport] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [importDialog, setImportDialog] = useState(false);
  const [runningBackup, setRunningBackup] = useState(false);
  const [runningRestore, setRunningRestore] = useState(false);

  const refreshBackups = useCallback(async () => {
    const { data } = await adminApi.backups.getAll();
    if (data) {
      setBackups(data);
    }
  }, [adminApi]);

  useEffect(() => {
    let active = true;
    void adminApi.backups.getAll().then(({ data }) => {
      if (active && data) {
        setBackups(data);
      }
    });
    return () => {
      active = false;
    };
  }, [adminApi]);

  async function createBackup() {
    setRunningBackup(true);
    const { data } = await adminApi.backups.create();

    if (data?.error === false) {
      void refreshBackups();
      alert.success(t("settings.backup.backup-created"));
    }
    else {
      alert.error(t("settings.backup.error-creating-backup-see-log-file"));
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
      alert.error(t("settings.backup.restore-fail"));
    }
    else {
      alert.success(t("settings.backup.restore-success"));
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  }

  async function deleteBackup() {
    const { data } = await adminApi.backups.delete(deleteTarget);

    if (!data?.error) {
      alert.success(t("settings.backup.backup-deleted"));
      void refreshBackups();
    }
  }

  const headers: DataTableHeader<BackupFile>[] = [
    { title: t("general.name"), key: "name" },
    { title: t("general.created"), key: "date" },
    { title: t("export.size"), key: "size" },
    { title: "", key: "actions", align: "end" },
  ];

  function selectBackup(data: { name: string }) {
    if (!data.name) {
      return;
    }
    setSelected(data.name);
  }

  return (
    <Container maxWidth={false}>
      <section>
        {/* Delete Dialog */}
        <BaseDialog
          open={deleteDialog}
          onOpenChange={setDeleteDialog}
          bottomSheet
          title={t("settings.backup.delete-backup")}
          color="error"
          icon={icons.alertCircle}
          canConfirm
          onConfirm={() => void deleteBackup()}
        >
          <CardContent>
            {t("general.confirm-delete-generic")}
          </CardContent>
        </BaseDialog>

        {/* Import Dialog */}
        <BaseDialog
          open={importDialog}
          onOpenChange={setImportDialog}
          bottomSheet
          color="error"
          title={t("settings.backup.backup-restore")}
          icon={icons.database}
          customCardAction={(
            <BaseButton
              delete
              disabled={!confirmImport || runningRestore}
              icon={icons.database}
              onClick={() => void restoreBackup(selected)}
            >
              {t("settings.backup.restore-backup")}
            </BaseButton>
          )}
        >
          <Divider />
          <CardContent>
            <I18nT
              keypath="settings.backup.back-restore-description"
              slots={{ "cannot-be-undone": <b>{t("settings.backup.cannot-be-undone")}</b> }}
            />

            <Box component="p" sx={{ mt: 1.5 }}>
              <I18nT
                keypath="settings.backup.postgresql-note"
                slots={{
                  "backup-restore-process": (
                    <Box
                      component="a"
                      sx={{ color: "primary.main" }}
                      href="https://nightly.mealie.io/documentation/getting-started/usage/backups-and-restoring/"
                    >
                      {t("settings.backup.backup-restore-process-in-the-documentation")}
                    </Box>
                  ),
                }}
              />
            </Box>

            <FormControlLabel
              sx={{ alignItems: "flex-start" }}
              control={(
                <Checkbox
                  color="error"
                  checked={confirmImport}
                  onChange={event => setConfirmImport(event.target.checked)}
                />
              )}
              label={t("settings.backup.irreversible-acknowledgment")}
            />
          </CardContent>
          <Typography component="p" variant="caption" sx={{ pb: 0, mb: 0.5, textAlign: "center" }}>
            {selected}
          </Typography>
          {runningRestore && <LinearProgress />}
        </BaseDialog>

        <section>
          <BaseCardSectionTitle title={t("settings.backup-and-exports")}>
            <Box component="span" sx={{ py: 0, px: 0.5 }}>
              <I18nT keypath="settings.backup.experimental-description" />
            </Box>
          </BaseCardSectionTitle>
          <Toolbar sx={{ bgcolor: "transparent", boxShadow: "none", justifyContent: "space-between" }}>
            <BaseButton sx={{ mr: 1 }} loading={runningBackup} onClick={() => void createBackup()}>
              {t("settings.backup.create-heading")}
            </BaseButton>
            <Box sx={{ flexGrow: 1 }} />
            <AppButtonUpload
              textBtn={false}
              url="/api/admin/backups/upload"
              accept=".zip"
              color="info"
              onUploaded={() => void refreshBackups()}
            />
          </Toolbar>

          <BaseDataTable
            headers={headers}
            items={backups.imports || []}
            itemKey="name"
            elevation={0}
            itemsPerPage={-1}
            hideDefaultFooter
            disablePagination
            slots={{
              date: item => d(Date.parse(item.date)),
              actions: item => (
                <>
                  <IconButton
                    color="error"
                    sx={{ mx: 0.5 }}
                    onClick={(event) => {
                      event.stopPropagation();
                      setDeleteDialog(true);
                      setDeleteTarget(item.name);
                    }}
                  >
                    <MdiIcon path={icons.delete} />
                  </IconButton>
                  <BaseButton
                    small
                    download
                    downloadUrl={backupsFileNameDownload(item.name)}
                    sx={{ mx: 0.5 }}
                    onClick={event => event.stopPropagation()}
                  />
                  <BaseButton
                    small
                    icon={icons.backupRestore}
                    onClick={(event) => {
                      event.stopPropagation();
                      selectBackup(item);
                      setImportDialog(true);
                    }}
                  >
                    {t("settings.backup.backup-restore")}
                  </BaseButton>
                </>
              ),
            }}
          />
          <Divider />
          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
            <div />
          </Box>
        </section>
      </section>
      <Container sx={{ mt: 2, display: "flex", justifyContent: "center", textAlign: "center" }}>
        <Box component={Link} sx={{ color: "primary.main" }} to="/group/migrations">
          {t("recipe.looking-for-migrations")}
        </Box>
      </Container>
    </Container>
  );
}
