import { useEffect, useState } from "react";
import { useParams } from "react-router";
import Box from "@mui/material/Box";
import { BaseCardSectionTitle } from "~/components/global/BaseCardSectionTitle";
import { BaseContainer } from "~/components/global/BaseContainer";
import { BasePageTitle, BasePageTitleImage } from "~/components/global/BasePageTitle";
import { DataTable } from "~/components/global/DataTable";
import type { DataTableHeader } from "~/components/global/DataTable";
import { Icon } from "~/components/global/Icon";
import { useUserApi } from "~/hooks/api";
import { useI18n } from "~/hooks/use-global-i18n";
import { icons } from "~/lib/icons";
import type { ReportEntryOut, ReportOut } from "~/lib/api/types/reports";

export default function GroupReportPage() {
  const i18n = useI18n();
  const api = useUserApi();
  const id = useParams().id || "";
  const [report, setReport] = useState<ReportOut | null>(null);

  useEffect(() => {
    void api.groupReports.getOne(id).then(({ data }) => setReport(data ?? null));
  }, [api, id]);

  const itemHeaders: DataTableHeader<ReportEntryOut>[] = [
    {
      title: "Success",
      key: "success",
      render: item => <Icon path={item.success ? icons.checkboxMarkedCircle : icons.close} color={item.success ? "success" : "error"} />,
    },
    { title: "Message", key: "message" },
    { title: "Timestamp", key: "timestamp", render: item => i18n.d(Date.parse(item.timestamp!), "short") },
  ];

  return (
    <BaseContainer>
      <BasePageTitle
        divider
        header={<Box sx={{ mb: 1 }}><BasePageTitleImage src="/svgs/data-reports.svg" maxWidth={200} maxHeight={200} /></Box>}
        title={i18n.t("group.report")}
      />
      {report && (
        <BaseContainer>
          <BaseCardSectionTitle title={report.name} />
          <Box sx={{ p: 2 }}>{i18n.t("group.report-with-id", { id })}</Box>
          <DataTable<ReportEntryOut>
            headers={itemHeaders}
            items={report.entries ?? []}
            itemsPerPage={50}
            expandedRow={item => item.exception && <Box sx={{ p: 3 }}>{item.exception}</Box>}
          />
        </BaseContainer>
      )}
    </BaseContainer>
  );
}
