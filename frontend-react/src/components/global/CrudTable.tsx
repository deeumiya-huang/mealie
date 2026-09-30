import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Popover from "@mui/material/Popover";
import { icons } from "~/lib/icons";
import { useI18n } from "~/hooks/use-global-i18n";
import { downloadAsJson } from "~/hooks/use-utils";
import { BaseButton } from "./BaseButton";
import { BaseButtonGroup } from "./BaseButtonGroup";
import { BaseOverflowButton } from "./BaseOverflowButton";
import { DataTable } from "./DataTable";
import type { DataTableHeader } from "./DataTable";
import { Icon } from "./Icon";
import { CheckboxInput, TextInput } from "./form";

export interface TableConfig {
  hideColumns: boolean;
  canExport: boolean;
}

export interface TableHeaders {
  text: string;
  value: string;
  show: boolean;
  align?: "start" | "center" | "end";
  sortable?: boolean;
  sort?: (a: unknown, b: unknown) => number;
}

export interface BulkAction {
  icon: string;
  text: string;
  event: string;
}

export interface CrudTableProps<T> {
  tableConfig?: TableConfig;
  headers: TableHeaders[];
  data: T[] | null | undefined;
  bulkActions?: BulkAction[];
  initialSort?: string;
  initialSortDesc?: boolean;
  onDeleteOne?: (item: T) => void;
  onEditOne?: (item: T) => void;
  onBulkAction?: (event: string, items: T[]) => void;
  /** Custom cells by header value (the Vue `#item.<value>` slots). */
  cells?: Partial<Record<string, (item: T) => ReactNode>>;
  buttonRow?: ReactNode;
  buttonBottom?: ReactNode;
}

export function CrudTable<T>({
  tableConfig = { hideColumns: false, canExport: false }, headers, data, bulkActions = [], initialSort = "id", initialSortDesc = false,
  onDeleteOne, onEditOne, onBulkAction, cells = {}, buttonRow, buttonBottom,
}: CrudTableProps<T>) {
  const i18n = useI18n();
  const [localHeaders, setLocalHeaders] = useState<TableHeaders[]>([...headers]);
  const [selected, setSelected] = useState<T[]>([]);
  const [search, setSearch] = useState("");
  const [columnsAnchor, setColumnsAnchor] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setLocalHeaders([...headers]);
  }, [headers]);

  const activeHeaders: DataTableHeader<T>[] = [
    ...localHeaders.filter(h => h.show).map(h => ({
      title: h.text,
      key: h.value,
      align: h.align,
      sortable: h.sortable,
      sort: h.sort,
      render: cells[h.value] ? (item: T) => cells[h.value]!(item) : undefined,
    })),
    {
      title: "",
      key: "actions",
      align: "end",
      sortable: false,
      render: (item: T) => (
        <BaseButtonGroup
          buttons={[
            { icon: icons.edit, text: i18n.t("general.edit"), event: "edit" },
            { icon: icons.delete, text: i18n.t("general.delete"), event: "delete" },
          ]}
          onEvent={(e) => {
            if (e === "delete") onDeleteOne?.(item);
            if (e === "edit") onEditOne?.(item);
          }}
        />
      ),
    },
  ];

  return (
    <div>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, p: 1, alignItems: "center" }}>
        {tableConfig.hideColumns && (
          <>
            <Button color="accent" variant="contained" onClick={e => setColumnsAnchor(e.currentTarget)}>
              <Icon path={icons.cog} />
            </Button>
            <Popover open={!!columnsAnchor} anchorEl={columnsAnchor} onClose={() => setColumnsAnchor(null)} anchorOrigin={{ vertical: "bottom", horizontal: "left" }}>
              <Card>
                <CardContent>
                  {localHeaders.map((h, i) => (
                    <CheckboxInput
                      key={h.value}
                      density="compact"
                      label={h.text}
                      hideDetails
                      checked={h.show}
                      onChange={show => setLocalHeaders(prev => prev.map((x, j) => (j === i ? { ...x, show } : x)))}
                    />
                  ))}
                </CardContent>
              </Card>
            </Popover>
          </>
        )}
        {bulkActions.length > 0 && (
          <BaseOverflowButton
            disabled={selected.length < 1}
            mode="event"
            items={bulkActions}
            onEvent={(event) => {
              onBulkAction?.(event, selected);
              setSelected([]);
            }}
          />
        )}
        {buttonRow}
      </Box>
      <Box sx={{ mx: 1, maxWidth: 400 }}>
        <TextInput value={search} onChange={setSearch} variant="underlined" label={i18n.t("search.search")} />
      </Box>
      <DataTable
        headers={activeHeaders}
        items={data || []}
        showSelect={bulkActions.length > 0}
        selected={selected}
        onSelectedChange={setSelected}
        sortBy={[{ key: initialSort, order: initialSortDesc ? "desc" : "asc" }]}
        itemsPerPage={15}
        search={search}
      />
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, p: 1 }}>
        {buttonBottom}
        <BaseButton color="info" onClick={() => downloadAsJson(data, "export.json")} iconSlot={<Icon path={icons.download} />}>
          {i18n.t("general.download")}
        </BaseButton>
      </Box>
    </div>
  );
}

export default CrudTable;
