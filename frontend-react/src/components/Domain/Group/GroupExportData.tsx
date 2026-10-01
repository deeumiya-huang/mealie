import { formatDistanceToNow, parseISO } from "date-fns";
import { BaseButton } from "~/components/global/BaseButton";
import { DataTable } from "~/components/global/DataTable";
import type { DataTableHeader } from "~/components/global/DataTable";
import { useI18n } from "~/hooks/use-global-i18n";
import type { GroupDataExport } from "~/lib/api/types/group";

function getTimeToExpire(timeString: string) {
  return formatDistanceToNow(parseISO(timeString), { addSuffix: false });
}

export function GroupExportData({ exports }: { exports: GroupDataExport[] }) {
  const i18n = useI18n();

  const headers: DataTableHeader<GroupDataExport>[] = [
    { title: i18n.t("export.export"), key: "name" },
    { title: i18n.t("export.file-name"), key: "filename" },
    { title: i18n.t("export.size"), key: "size" },
    { title: i18n.t("export.link-expires"), key: "expires", render: item => getTimeToExpire(item.expires) },
    {
      title: "",
      key: "actions",
      render: item => <BaseButton download small downloadUrl={`/api/recipes/bulk-actions/export/${item.id}/download`} />,
    },
  ];

  return <DataTable<GroupDataExport> itemKey="id" headers={headers} items={exports} itemsPerPage={15} elevation={0} />;
}

export default GroupExportData;
