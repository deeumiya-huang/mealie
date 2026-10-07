// Usage: <CrudTable headers={headers} data={items} bulkActions={actions} tableConfig={{ hideColumns: true, canExport: true }}
//          slots={{ name: item => <b>{item.name}</b> }} buttonRow={<BaseButton … />} onEditOne={…} onDeleteOne={…}
//          onBulkAction={(event, items) => …} />
// Searchable table with a column-visibility menu, bulk actions on the selection, edit/delete buttons per row and a
// JSON export. Vue slots: `#item.<value>` → `slots[value]`, `#button-row` → `buttonRow`, `#button-bottom` → `buttonBottom`.
import { useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Popover from "@mui/material/Popover";
import TextField from "@mui/material/TextField";
import { downloadAsJson } from "@/hooks/use-utils";
import { useI18n } from "@/i18n";
import { icons } from "@/lib/icons";
import { BaseButton } from "./BaseButton";
import { BaseButtonGroup } from "./BaseButtonGroup";
import { BaseDataTable, type DataTableHeader } from "./BaseDataTable";
import { BaseOverflowButton, type MenuItemSpec } from "./BaseOverflowButton";
import { MdiIcon } from "./MdiIcon";

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
  /** Comparator for the column's values; method syntax so a typed `(a: Label, b: Label) => number` fits. */
  sort?(a: unknown, b: unknown): number;
}

export interface BulkAction {
  icon: string;
  text: string;
  event: string;
}

interface CrudTableProps<T> {
  tableConfig?: TableConfig;
  headers: TableHeaders[];
  data: T[];
  bulkActions?: BulkAction[];
  initialSort?: string;
  initialSortDesc?: boolean;
  slots?: Record<string, (item: T) => ReactNode>;
  buttonRow?: ReactNode;
  buttonBottom?: ReactNode;
  onDeleteOne?: (item: T) => void;
  onEditOne?: (item: T) => void;
  onBulkAction?: (event: string, items: T[]) => void;
}

const DEFAULT_CONFIG: TableConfig = { hideColumns: false, canExport: false };
const NO_ACTIONS: BulkAction[] = [];

export function CrudTable<T extends object>({
  tableConfig = DEFAULT_CONFIG,
  headers,
  data,
  bulkActions = NO_ACTIONS,
  initialSort = "id",
  initialSortDesc = false,
  slots = {},
  buttonRow,
  buttonBottom,
  onDeleteOne,
  onEditOne,
  onBulkAction,
}: CrudTableProps<T>) {
  const { t } = useI18n();

  // column visibility toggled by the user; falls back to the header's own `show`
  const [shown, setShown] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<T[]>([]);
  const [search, setSearch] = useState("");
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  const localHeaders = headers.map(header => ({ ...header, show: shown[header.value] ?? header.show }));

  const tableHeaders: DataTableHeader<T>[] = [
    ...localHeaders.filter(header => header.show).map(header => ({
      title: header.text,
      key: header.value,
      align: header.align,
      sortable: header.sortable,
      sort: header.sort,
    })),
    { title: "", key: "actions", sortable: false, align: "end" as const },
  ];

  const tableSlots: Record<string, (item: T) => ReactNode> = {
    ...slots,
    actions: item => (
      <BaseButtonGroup
        buttons={[
          { icon: icons.edit, text: t("general.edit"), event: "edit" },
          { icon: icons.delete, text: t("general.delete"), event: "delete" },
        ]}
        onAction={(event) => {
          if (event === "delete") onDeleteOne?.(item);
          else if (event === "edit") onEditOne?.(item);
        }}
      />
    ),
  };

  const bulkItems: MenuItemSpec[] = bulkActions.map(action => ({ text: action.text, icon: action.icon, event: action.event }));

  function onBulkActionPicked(event: string) {
    onBulkAction?.(event, selected);
    // clear selection
    setSelected([]);
  }

  return (
    <div>
      <CardActions sx={{ flexWrap: "wrap" }}>
        {tableConfig.hideColumns && (
          <>
            <Button color="accent" variant="contained" onClick={event => setMenuAnchor(event.currentTarget)}>
              <MdiIcon path={icons.cog} />
            </Button>
            <Popover
              open={menuAnchor !== null}
              anchorEl={menuAnchor}
              onClose={() => setMenuAnchor(null)}
              anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
            >
              <Card>
                <CardContent>
                  {localHeaders.map(itemValue => (
                    <Box key={itemValue.text + itemValue.show}>
                      <FormControlLabel
                        control={(
                          <Checkbox
                            size="small"
                            checked={itemValue.show}
                            onChange={event => setShown(current => ({ ...current, [itemValue.value]: event.target.checked }))}
                          />
                        )}
                        label={itemValue.text}
                      />
                    </Box>
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
            color="info"
            sx={{ "&.Mui-disabled": { opacity: 0.5 } }}
            items={bulkItems}
            onAction={onBulkActionPicked}
          />
        )}
        {buttonRow}
      </CardActions>
      <Box sx={{ mx: 1, maxWidth: 400 }}>
        <TextField
          fullWidth
          variant="standard"
          label={t("search.search")}
          value={search}
          onChange={event => setSearch(event.target.value)}
        />
      </Box>
      <BaseDataTable<T>
        headers={tableHeaders}
        items={data || []}
        itemsPerPage={15}
        search={search}
        sortBy={[{ key: initialSort, order: initialSortDesc ? "desc" : "asc" }]}
        showSelect={bulkActions.length > 0}
        selected={selected}
        onSelectedChange={setSelected}
        slots={tableSlots}
        elevation={2}
      />
      <CardActions sx={{ justifyContent: "flex-end" }}>
        {buttonBottom}
        <BaseButton color="info" icon={icons.download} onClick={() => downloadAsJson(data, "export.json")}>
          {t("general.download")}
        </BaseButton>
      </CardActions>
    </div>
  );
}
