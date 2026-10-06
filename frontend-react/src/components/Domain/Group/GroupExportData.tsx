// Usage: <GroupExportData exports={groupExports} /> — table of the group's recipe data exports (name, file name, size,
// time until the download link expires, download button).
import { formatDistanceToNow, parseISO } from "date-fns";
import { BaseButton } from "@/components/global/BaseButton";
import { BaseDataTable, type DataTableHeader } from "@/components/global/BaseDataTable";
import { useI18n } from "@/i18n";
import type { GroupDataExport } from "@/lib/api/types/group";

interface GroupExportDataProps {
  exports: GroupDataExport[];
}

function getTimeToExpire(timeString: string) {
  const expiresAt = parseISO(timeString);

  return formatDistanceToNow(expiresAt, {
    addSuffix: false,
  });
}

function downloadData() {
  console.log("Downloading data...");
}

export function GroupExportData({ exports }: GroupExportDataProps) {
  const { t } = useI18n();

  const headers: DataTableHeader<GroupDataExport>[] = [
    { title: t("export.export"), key: "name" },
    { title: t("export.file-name"), key: "filename" },
    { title: t("export.size"), key: "size" },
    { title: t("export.link-expires"), key: "expires" },
    { title: "", key: "actions" },
  ];

  return (
    <BaseDataTable<GroupDataExport>
      headers={headers}
      items={exports}
      itemKey="id"
      itemsPerPage={15}
      elevation={0}
      onRowClick={downloadData}
      slots={{
        expires: item => getTimeToExpire(item.expires),
        actions: item => (
          <BaseButton
            download
            small
            downloadUrl={`/api/recipes/bulk-actions/export/${item.id}/download`}
          />
        ),
      }}
    />
  );
}
