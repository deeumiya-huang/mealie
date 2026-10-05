// Usage: <ReportTable items={reports} onDelete={id => …} /> — table of group reports (category, name, timestamp,
// status, delete). Clicking a row opens /group/reports/<id> unless the report is still in progress.
import IconButton from "@mui/material/IconButton";
import { useNavigate } from "react-router";
import { useI18n } from "@/i18n";
import { icons } from "@/lib/icons";
import type { ReportSummary } from "@/lib/api/types/reports";
import { BaseDataTable, type DataTableHeader } from "./BaseDataTable";
import { MdiIcon } from "./MdiIcon";

interface ReportTableProps {
  items: ReportSummary[];
  onDelete?: (id: string) => void;
}

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function ReportTable({ items, onDelete }: ReportTableProps) {
  const { t, d } = useI18n();
  const navigate = useNavigate();

  const headers: DataTableHeader<ReportSummary>[] = [
    { title: t("category.category"), key: "category" },
    { title: t("general.name"), key: "name" },
    { title: t("general.timestamp"), key: "timestamp" },
    { title: t("general.status"), key: "status" },
    { title: t("general.delete"), key: "actions" },
  ];

  function handleRowClick(item: ReportSummary) {
    if (item.status === "in-progress") {
      return;
    }

    void navigate(`/group/reports/${item.id}`);
  }

  return (
    <BaseDataTable<ReportSummary>
      headers={headers}
      items={items}
      itemKey="id"
      itemsPerPage={50}
      onRowClick={handleRowClick}
      slots={{
        category: item => capitalize(item.category),
        timestamp: item => d(Date.parse(item.timestamp!), "long"),
        status: item => capitalize(item.status!),
        actions: item => (
          <IconButton
            onClick={(event) => {
              event.stopPropagation();
              onDelete?.(item.id);
            }}
          >
            <MdiIcon path={icons.delete} />
          </IconButton>
        ),
      }}
    />
  );
}
