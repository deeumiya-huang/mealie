import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import LinearProgress from "@mui/material/LinearProgress";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import type { SxProps, Theme } from "@mui/material/styles";
import { useI18n } from "~/hooks/use-global-i18n";

export interface DataTableHeader<T> {
  title: string;
  /** Property read for display, sorting and search. */
  key: string;
  align?: "start" | "center" | "end";
  sortable?: boolean;
  sort?: (a: unknown, b: unknown) => number;
  width?: number | string;
  /** Custom cell (the Vue `#item.<key>` slot). */
  render?: (item: T, index: number) => ReactNode;
  value?: (item: T) => unknown;
}

export interface DataTableProps<T> {
  headers: DataTableHeader<T>[];
  items: T[];
  itemKey?: keyof T | ((item: T) => string | number);
  itemsPerPage?: number;
  itemsPerPageOptions?: number[];
  search?: string;
  /** Initial sort (`sort-by`). */
  sortBy?: { key: string; order: "asc" | "desc" }[];
  showSelect?: boolean;
  selected?: T[];
  onSelectedChange?: (items: T[]) => void;
  onRowClick?: (item: T) => void;
  loading?: boolean;
  noDataText?: string;
  density?: "default" | "compact" | "comfortable";
  hideDefaultFooter?: boolean;
  sx?: SxProps<Theme>;
  elevation?: number;
  /** Server-side mode (`v-data-table-server`): items are one page; the parent handles paging/sorting. */
  server?: {
    total: number;
    page: number;
    onPageChange: (page: number) => void;
    onItemsPerPageChange?: (perPage: number) => void;
    onSortChange?: (sort: { key: string; order: "asc" | "desc" } | null) => void;
  };
  /** Row class/style hook. */
  rowSx?: (item: T) => SxProps<Theme> | undefined;
}

function readValue<T>(item: T, header: DataTableHeader<T>): unknown {
  if (header.value) return header.value(item);
  return header.key.split(".").reduce<unknown>((acc, part) => (acc as Record<string, unknown> | null)?.[part], item);
}

function defaultCompare(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean") return a === b ? 0 : a ? -1 : 1;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

const ALIGN = { start: "left", center: "center", end: "right" } as const;

/**
 * `<v-data-table>` equivalent: client-side search, sort, pagination and row selection.
 */
export function DataTable<T>(props: DataTableProps<T>) {
  const {
    headers, items, itemKey, itemsPerPage = 10, itemsPerPageOptions = [5, 10, 15, 25, 50, 100], search = "", sortBy, showSelect = false,
    selected = [], onSelectedChange, onRowClick, loading = false, noDataText, density = "default", hideDefaultFooter = false, sx,
    elevation = 2, server, rowSx,
  } = props;
  const i18n = useI18n();
  const [sort, setSort] = useState<{ key: string; order: "asc" | "desc" } | null>(sortBy?.[0] ?? null);
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(itemsPerPage);

  const keyOf = (item: T, index: number): string | number => {
    if (typeof itemKey === "function") return itemKey(item);
    if (itemKey) return item[itemKey] as unknown as string | number;
    const id = (item as { id?: string | number } | null)?.id;
    return id ?? index;
  };

  const filtered = useMemo(() => {
    if (server || !search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(item => headers.some((h) => {
      const v = readValue(item, h);
      return v !== null && v !== undefined && typeof v !== "object" && String(v).toLowerCase().includes(q);
    }));
  }, [items, search, headers, server]);

  const sorted = useMemo(() => {
    if (server || !sort) return filtered;
    const header = headers.find(h => h.key === sort.key);
    const compare = header?.sort ?? defaultCompare;
    const withValues = filtered.map(item => ({ item, value: header ? readValue(item, header) : (item as Record<string, unknown>)[sort.key] }));
    withValues.sort((a, b) => compare(a.value, b.value) * (sort.order === "desc" ? -1 : 1));
    return withValues.map(x => x.item);
  }, [filtered, sort, headers, server]);

  const pageCount = perPage === -1 ? 1 : Math.max(1, Math.ceil(sorted.length / perPage));
  const currentPage = server ? server.page - 1 : Math.min(page, pageCount - 1);
  const visible = server || perPage === -1 ? sorted : sorted.slice(currentPage * perPage, currentPage * perPage + perPage);

  const selectedKeys = new Set(selected.map((s, i) => keyOf(s, i)));
  const isSelected = (item: T, index: number) => selectedKeys.has(keyOf(item, index));
  const allVisibleSelected = visible.length > 0 && visible.every((item, i) => isSelected(item, i));

  const toggleAll = () => {
    if (allVisibleSelected) {
      const visibleKeys = new Set(visible.map((item, i) => keyOf(item, i)));
      onSelectedChange?.(selected.filter((s, i) => !visibleKeys.has(keyOf(s, i))));
    }
    else {
      const next = [...selected];
      visible.forEach((item, i) => {
        if (!isSelected(item, i)) next.push(item);
      });
      onSelectedChange?.(next);
    }
  };

  const toggleOne = (item: T, index: number) => {
    const key = keyOf(item, index);
    if (selectedKeys.has(key)) onSelectedChange?.(selected.filter((s, i) => keyOf(s, i) !== key));
    else onSelectedChange?.([...selected, item]);
  };

  const changeSort = (key: string) => {
    const next: { key: string; order: "asc" | "desc" } | null = !sort || sort.key !== key
      ? { key, order: "asc" }
      : sort.order === "asc" ? { key, order: "desc" } : null;
    setSort(next);
    server?.onSortChange?.(next);
  };

  const size = density === "compact" ? "small" : "medium";

  return (
    <Paper elevation={elevation} sx={sx}>
      {loading && <LinearProgress />}
      <TableContainer>
        <Table size={size}>
          <TableHead>
            <TableRow>
              {showSelect && (
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={!allVisibleSelected && visible.some((item, i) => isSelected(item, i))}
                    checked={allVisibleSelected}
                    onChange={toggleAll}
                  />
                </TableCell>
              )}
              {headers.map(header => (
                <TableCell key={header.key} align={ALIGN[header.align ?? "start"]} sx={{ width: header.width, fontWeight: "bold", whiteSpace: "nowrap" }}>
                  {header.sortable === false || !header.title
                    ? header.title
                    : (
                        <TableSortLabel
                          active={sort?.key === header.key}
                          direction={sort?.key === header.key ? sort.order : "asc"}
                          onClick={() => changeSort(header.key)}
                        >
                          {header.title}
                        </TableSortLabel>
                      )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {visible.length === 0 && (
              <TableRow>
                <TableCell colSpan={headers.length + (showSelect ? 1 : 0)} align="center">
                  {loading ? i18n.t("general.loading") : (noDataText ?? i18n.t("search.no-results"))}
                </TableCell>
              </TableRow>
            )}
            {visible.map((item, index) => (
              <TableRow
                key={keyOf(item, index)}
                hover
                selected={showSelect && isSelected(item, index)}
                onClick={onRowClick ? () => onRowClick(item) : undefined}
                sx={[{ cursor: onRowClick ? "pointer" : undefined }, ...(rowSx?.(item) ? [rowSx(item)!] : [])] as SxProps<Theme>}
              >
                {showSelect && (
                  <TableCell padding="checkbox" onClick={e => e.stopPropagation()}>
                    <Checkbox checked={isSelected(item, index)} onChange={() => toggleOne(item, index)} />
                  </TableCell>
                )}
                {headers.map(header => (
                  <TableCell key={header.key} align={ALIGN[header.align ?? "start"]}>
                    {header.render ? header.render(item, index) : String(readValue(item, header) ?? "")}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {!hideDefaultFooter && (
        <Box>
          <TablePagination
            component="div"
            count={server ? server.total : sorted.length}
            page={currentPage}
            onPageChange={(_e, p) => (server ? server.onPageChange(p + 1) : setPage(p))}
            rowsPerPage={perPage}
            // Vuetify labelled -1 as "All" from its own locale pack; there is no app message for it, so the
            // show-everything option is labelled with the item count instead.
            rowsPerPageOptions={[...itemsPerPageOptions, ...(perPage === -1 ? [-1] : [])]
              .map(n => (n === -1 ? { label: String(server ? server.total : sorted.length), value: -1 } : n))}
            onRowsPerPageChange={(e) => {
              const n = Number(e.target.value);
              setPerPage(n);
              setPage(0);
              server?.onItemsPerPageChange?.(n);
            }}
          />
        </Box>
      )}
    </Paper>
  );
}

export default DataTable;
