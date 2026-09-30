import IconButton from "@mui/material/IconButton";
import { useNavigate } from "react-router";
import type { ReportSummary } from "~/lib/api/types/reports";
import { icons } from "~/lib/icons";
import { useI18n } from "~/hooks/use-global-i18n";
import { DataTable } from "./DataTable";
import { Icon } from "./Icon";

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function ReportTable({ items, onDelete }: { items: ReportSummary[]; onDelete?: (id: string) => void }) {
  const i18n = useI18n();
  const navigate = useNavigate();

  return (
    <DataTable
      elevation={0}
      items={items}
      itemsPerPage={50}
      onRowClick={(item) => {
        if (item.status === "in-progress") return;
        void navigate(`/group/reports/${item.id}`);
      }}
      headers={[
        { title: i18n.t("category.category"), key: "category", render: item => capitalize(item.category) },
        { title: i18n.t("general.name"), key: "name" },
        { title: i18n.t("general.timestamp"), key: "timestamp", render: item => i18n.d(Date.parse(item.timestamp!), "long") },
        { title: i18n.t("general.status"), key: "status", render: item => capitalize(item.status!) },
        {
          title: i18n.t("general.delete"),
          key: "actions",
          sortable: false,
          render: item => (
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(item.id);
              }}
            >
              <Icon path={icons.delete} />
            </IconButton>
          ),
        },
      ]}
    />
  );
}

export default ReportTable;
