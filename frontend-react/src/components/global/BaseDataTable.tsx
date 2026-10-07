// Usage:
//   const headers: DataTableHeader<User>[] = [
//     { title: t("user.username"), key: "username" },
//     { title: t("user.admin"), key: "admin", align: "center" },
//     { title: "", key: "actions", sortable: false, align: "end" },
//   ];
//   <BaseDataTable headers={headers} items={users} itemKey="id" search={search} itemsPerPage={15}
//     slots={{ admin: user => <MdiIcon path={user.admin ? icons.checkboxMarkedCircle : icons.windowClose} /> }}
//     onRowClick={user => navigate(…)} showSelect selected={selected} onSelectedChange={setSelected} />
// Replacement for <v-data-table> on a real <table> (E2E selects `cell`/`row`): click-to-sort headers
// (asc → desc → none), Vuetify's search filter (case-insensitive substring over the header columns),
// pagination (`itemsPerPage`, -1 = all; `hideDefaultFooter`/`disablePagination`), selection of whole items
// (`return-object`), `slots` = Vue `#item.<key>`. Pagination labels are MUI's built-ins (D34).
import { useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import LinearProgress from "@mui/material/LinearProgress";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import type { SxProps, Theme } from "@mui/material/styles";

export interface DataTableHeader<T> {
  title: string;
  key: string;
  sortable?: boolean;
  align?: "start" | "center" | "end";
  width?: number | string;
  /** Value used for display, sorting and search; default `item[key]`. */
  value?: (item: T) => unknown;
  /** Comparator for this column's values (Vuetify header `sort`); default: numbers, dates, then text. */
  sort?(a: unknown, b: unknown): number;
}

export interface DataTableSort {
  key: string;
  order: "asc" | "desc";
}

interface BaseDataTableProps<T> {
  headers: DataTableHeader<T>[];
  items: T[];
  /** Property that identifies an item (Vue `item-key` / `item-value`), default "id". */
  itemKey?: keyof T & string;
  search?: string;
  sortBy?: DataTableSort[];
  itemsPerPage?: number;
  itemsPerPageOptions?: number[];
  hideDefaultFooter?: boolean;
  disablePagination?: boolean;
  loading?: boolean;
  showSelect?: boolean;
  selected?: T[];
  onSelectedChange?: (items: T[]) => void;
  slots?: Record<string, (item: T) => ReactNode>;
  onRowClick?: (item: T) => void;
  noDataText?: ReactNode;
  density?: "default" | "comfortable" | "compact";
  elevation?: number;
  className?: string;
  sx?: SxProps<Theme>;
}

const ALIGN = { start: "left", center: "center", end: "right" } as const;

function cellValue<T>(header: DataTableHeader<T>, item: T): unknown {
  return header.value ? header.value(item) : (item as Record<string, unknown>)[header.key];
}

function display(value: unknown): ReactNode {
  if (value === null || value === undefined) return "";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

function compare(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return -1;
  if (b === null || b === undefined) return 1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === "boolean" && typeof b === "boolean") return Number(a) - Number(b);
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

export function BaseDataTable<T>({
  headers, items, itemKey = "id" as keyof T & string, search = "", sortBy = [], itemsPerPage = 10,
  itemsPerPageOptions = [5, 10, 25, 50, 100], hideDefaultFooter = false, disablePagination = false,
  loading = false, showSelect = false, selected = [], onSelectedChange, slots = {}, onRowClick, noDataText,
  density = "default", elevation = 0, className, sx,
}: BaseDataTableProps<T>) {
  const [sort, setSort] = useState<DataTableSort | null>(sortBy[0] ?? null);
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(itemsPerPage);

  // Like v-data-table: a new search goes back to the first page, a new `itemsPerPage` prop is applied.
  const [prevSearch, setPrevSearch] = useState(search);
  if (search !== prevSearch) {
    setPrevSearch(search);
    setPage(0);
  }
  const [prevItemsPerPage, setPrevItemsPerPage] = useState(itemsPerPage);
  if (itemsPerPage !== prevItemsPerPage) {
    setPrevItemsPerPage(itemsPerPage);
    setPerPage(itemsPerPage);
    setPage(0);
  }

  const keyOf = (item: T) => String((item as Record<string, unknown>)[itemKey]);

  const query = search.trim().toLocaleLowerCase();
  const filtered = query
    ? items.filter(item => headers.some((header) => {
        const value = cellValue(header, item);
        return value !== null && value !== undefined && String(value).toLocaleLowerCase().includes(query);
      }))
    : items;

  // Like v-data-table, a sort key without a header (e.g. CrudTable's default "id") sorts by the raw item value.
  const sortHeader = sort ? headers.find(header => header.key === sort.key) : undefined;
  const sortValue = (item: T) => sortHeader ? cellValue(sortHeader, item) : (item as Record<string, unknown>)[sort?.key ?? ""];
  const sorted = sort
    ? [...filtered].sort((a, b) => (sortHeader?.sort ?? compare)(sortValue(a), sortValue(b)) * (sort.order === "asc" ? 1 : -1))
    : filtered;

  const pageSizes = [...new Set([...itemsPerPageOptions, itemsPerPage].filter(n => n > 0))].sort((a, b) => a - b);
  const paginate = !disablePagination && perPage > 0;
  const pageCount = paginate ? Math.max(1, Math.ceil(sorted.length / perPage)) : 1;
  const currentPage = Math.min(page, pageCount - 1);
  const visible = paginate ? sorted.slice(currentPage * perPage, (currentPage + 1) * perPage) : sorted;

  const selectedKeys = new Set(selected.map(keyOf));
  const allVisibleSelected = visible.length > 0 && visible.every(item => selectedKeys.has(keyOf(item)));
  const someVisibleSelected = visible.some(item => selectedKeys.has(keyOf(item)));

  function toggleSort(key: string) {
    setSort((current) => {
      if (!current || current.key !== key) return { key, order: "asc" };
      return current.order === "asc" ? { key, order: "desc" } : null;
    });
  }

  function toggleItem(item: T) {
    const key = keyOf(item);
    onSelectedChange?.(selectedKeys.has(key) ? selected.filter(s => keyOf(s) !== key) : [...selected, item]);
  }

  function toggleAll() {
    const visibleKeys = new Set(visible.map(keyOf));
    onSelectedChange?.(allVisibleSelected
      ? selected.filter(s => !visibleKeys.has(keyOf(s)))
      : [...selected, ...visible.filter(item => !selectedKeys.has(keyOf(item)))]);
  }

  return (
    <Paper elevation={elevation} className={className} sx={[{ position: "relative", overflowX: "auto" }, ...(Array.isArray(sx) ? sx : [sx])]}>
      {loading && <LinearProgress sx={{ position: "absolute", top: 0, left: 0, right: 0 }} />}
      <Table size={density === "default" ? "medium" : "small"}>
        <TableHead>
          <TableRow>
            {showSelect && (
              <TableCell padding="checkbox">
                <Checkbox checked={allVisibleSelected} indeterminate={someVisibleSelected && !allVisibleSelected} onChange={toggleAll} />
              </TableCell>
            )}
            {headers.map(header => (
              <TableCell
                key={header.key}
                align={ALIGN[header.align ?? "start"]}
                sx={{ width: header.width, fontWeight: 500, whiteSpace: "nowrap" }}
                sortDirection={sort?.key === header.key ? sort.order : false}
              >
                {header.sortable === false || !header.title
                  ? header.title
                  : (
                      <TableSortLabel
                        active={sort?.key === header.key}
                        direction={sort?.key === header.key ? sort.order : "asc"}
                        onClick={() => toggleSort(header.key)}
                      >
                        {header.title}
                      </TableSortLabel>
                    )}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {visible.map(item => (
            <TableRow
              key={keyOf(item)}
              hover
              selected={selectedKeys.has(keyOf(item))}
              onClick={onRowClick ? () => onRowClick(item) : undefined}
              sx={onRowClick ? { cursor: "pointer" } : undefined}
            >
              {showSelect && (
                <TableCell padding="checkbox" onClick={event => event.stopPropagation()}>
                  <Checkbox checked={selectedKeys.has(keyOf(item))} onChange={() => toggleItem(item)} />
                </TableCell>
              )}
              {headers.map(header => (
                <TableCell key={header.key} align={ALIGN[header.align ?? "start"]}>
                  {slots[header.key] ? slots[header.key](item) : display(cellValue(header, item))}
                </TableCell>
              ))}
            </TableRow>
          ))}
          {visible.length === 0 && noDataText && (
            <TableRow>
              <TableCell colSpan={headers.length + (showSelect ? 1 : 0)} align="center">{noDataText}</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {!hideDefaultFooter && !disablePagination && (
        <Box>
          <TablePagination
            component="div"
            count={sorted.length}
            page={currentPage}
            rowsPerPage={perPage}
            rowsPerPageOptions={[...pageSizes, { value: -1, label: "∞" }]}
            onPageChange={(_event, next) => setPage(next)}
            onRowsPerPageChange={(event) => {
              setPerPage(Number(event.target.value));
              setPage(0);
            }}
          />
        </Box>
      )}
    </Paper>
  );
}
