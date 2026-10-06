import { Fragment, useEffect, useState } from "react";
import Box from "@mui/material/Box";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import { useParams } from "react-router";
import { BaseCardSectionTitle } from "@/components/global/BaseCardSectionTitle";
import { BaseImg } from "@/components/global/BaseImg";
import { BasePageTitle } from "@/components/global/BasePageTitle";
import { MdiIcon } from "@/components/global/MdiIcon";
import { useUserApi } from "@/hooks/api";
import { useI18n } from "@/i18n";
import type { ReportOut } from "@/lib/api/types/reports";
import { icons } from "@/lib/icons";

// Port of pages/group/reports/[id].vue (middleware ["auth"] is the loader guard in routes/group.tsx).
const itemHeaders = [
  { title: "Success", value: "success" },
  { title: "Message", value: "message" },
  { title: "Timestamp", value: "timestamp" },
];

export default function GroupReportPage() {
  const { t, d } = useI18n();
  const { id = "" } = useParams();
  const api = useUserApi();

  const [report, setReport] = useState<ReportOut | null>(null);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(50);

  useEffect(() => {
    let active = true;
    void api.groupReports.getOne(id).then(({ data }) => {
      if (active) {
        setReport(data ?? null);
      }
    });
    return () => {
      active = false;
    };
  }, [api, id]);

  function toggleExpanded(entryId: string) {
    setExpanded(current => (current.includes(entryId) ? current.filter(e => e !== entryId) : [...current, entryId]));
  }

  const entries = report?.entries ?? [];
  const visible = perPage > 0 ? entries.slice(page * perPage, (page + 1) * perPage) : entries;
  const colspan = itemHeaders.length + 1;

  return (
    <Container>
      <BasePageTitle
        divider
        header={<BaseImg width="100%" maxHeight="200px" maxWidth="200px" sx={{ mb: 1 }} src="/svgs/data-reports.svg" />}
        title={t("group.report")}
      />
      {report && (
        <Container>
          <BaseCardSectionTitle title={report.name} />

          <CardContent>{t("group.report-with-id", { id })}</CardContent>

          <Paper elevation={0} sx={{ overflowX: "auto" }}>
            <Table>
              <TableHead>
                <TableRow>
                  {itemHeaders.map(header => (
                    <TableCell key={header.value} sx={{ fontWeight: 500, whiteSpace: "nowrap" }}>{header.title}</TableCell>
                  ))}
                  <TableCell padding="checkbox" />
                </TableRow>
              </TableHead>
              <TableBody>
                {visible.map((item) => {
                  const isExpanded = expanded.includes(item.id);
                  return (
                    <Fragment key={item.id}>
                      <TableRow hover>
                        <TableCell>
                          <MdiIcon
                            color={item.success ? "success" : "error"}
                            path={item.success ? icons.checkboxMarkedCircle : icons.close}
                          />
                        </TableCell>
                        <TableCell>{item.message}</TableCell>
                        <TableCell>{d(Date.parse(item.timestamp!), "short")}</TableCell>
                        <TableCell padding="checkbox">
                          <IconButton aria-expanded={isExpanded} onClick={() => toggleExpanded(item.id)}>
                            <MdiIcon
                              path={icons.chevronDown}
                              sx={{ transform: isExpanded ? "rotate(180deg)" : undefined, transition: "transform 0.2s" }}
                            />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow>
                          {item.exception && (
                            <TableCell sx={{ p: 3 }} colSpan={colspan}>
                              {item.exception}
                            </TableCell>
                          )}
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
            <Box>
              <TablePagination
                component="div"
                count={entries.length}
                page={page}
                rowsPerPage={perPage}
                rowsPerPageOptions={[5, 10, 25, 50, 100, { value: -1, label: "∞" }]}
                onPageChange={(_event, next) => setPage(next)}
                onRowsPerPageChange={(event) => {
                  setPerPage(Number(event.target.value));
                  setPage(0);
                }}
              />
            </Box>
          </Paper>
        </Container>
      )}
    </Container>
  );
}
