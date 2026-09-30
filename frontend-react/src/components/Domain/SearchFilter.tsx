import { useState } from "react";
import type { ReactNode } from "react";
import Alert from "@mui/material/Alert";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Checkbox from "@mui/material/Checkbox";
import Divider from "@mui/material/Divider";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Popover from "@mui/material/Popover";
import Radio from "@mui/material/Radio";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import type { ISearchableItem } from "~/hooks/use-search";
import { useSearch } from "~/hooks/use-search";
import { useI18n } from "~/hooks/use-global-i18n";
import { TextInput } from "~/components/global/form";

export interface SearchFilterProps<T extends ISearchableItem> {
  items: T[];
  value: T[];
  onChange: (value: T[]) => void;
  /** `v-model:require-all`; the has-all/has-any toggle is shown only when provided. */
  requireAll?: boolean;
  onRequireAllChange?: (value: boolean) => void;
  radio?: boolean;
  /** Button content (the Vue default slot). */
  children?: ReactNode;
}

export function SearchFilter<T extends ISearchableItem>({ items, value, onChange, requireAll, onRequireAllChange, radio = false, children }: SearchFilterProps<T>) {
  const i18n = useI18n();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const { search: searchInput, setSearch, filtered } = useSearch(items);
  const selected = value ?? [];
  const selectedIds = new Set(selected.map(item => item.id));
  const selectedRadio = selected.length > 0 ? selected[0] : null;

  function toggle(item: T) {
    if (radio) {
      onChange(selectedRadio?.id === item.id ? [] : [item]);
      return;
    }
    onChange(selectedIds.has(item.id) ? selected.filter(s => s.id !== item.id) : [...selected, item]);
  }

  function clearSelection() {
    onChange([]);
    setSearch("");
  }

  return (
    <div>
      <Badge color="primary" badgeContent={selected.length} invisible={selected.length === 0}>
        <Button size="small" color="accent" variant="contained" onClick={e => setAnchor(e.currentTarget)}>
          {children}
        </Button>
      </Badge>
      <Popover open={!!anchor} anchorEl={anchor} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: "bottom", horizontal: "left" }}>
        <Card sx={{ width: 400, maxWidth: "100vw" }}>
          <CardContent>
            <TextInput value={searchInput} onChange={setSearch} sx={{ mb: 1 }} hideDetails variant="underlined" label={i18n.t("search.search")} clearable />
            <Box sx={{ display: "flex", flexWrap: "wrap", py: 2, px: 0.5, alignItems: "center" }}>
              {requireAll !== undefined && (
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  color="primary"
                  value={requireAll ? "hasAll" : "hasAny"}
                  onChange={(_e, v: string | null) => v && onRequireAllChange?.(v === "hasAll")}
                  sx={{ my: 0.5 }}
                >
                  <ToggleButton value="hasAll">{i18n.t("search.has-all")}</ToggleButton>
                  <ToggleButton value="hasAny">{i18n.t("search.has-any")}</ToggleButton>
                </ToggleButtonGroup>
              )}
              <Box sx={{ flex: 1 }} />
              <Button size="small" color="accent" variant="contained" sx={{ my: 0.5 }} onClick={clearSelection}>
                {i18n.t("search.clear-selection")}
              </Button>
            </Box>
            {filtered.length > 0
              ? (
                  <Box sx={{ maxHeight: 300, overflowY: "auto" }}>
                    {filtered.map(item => (
                      <Box key={`${radio ? "radio" : "checkbox"}-${item.id}`}>
                        <ListItemButton dense onClick={() => toggle(item)}>
                          {radio
                            ? <Radio size="small" color="primary" checked={selectedRadio?.id === item.id} tabIndex={-1} />
                            : <Checkbox size="small" color="primary" checked={selectedIds.has(item.id)} tabIndex={-1} />}
                          <ListItemText primary={item.name} />
                        </ListItemButton>
                        <Divider />
                      </Box>
                    ))}
                  </Box>
                )
              : <Alert severity="info" sx={{ mb: 0 }}>{i18n.t("search.no-results")}</Alert>}
          </CardContent>
        </Card>
      </Popover>
    </div>
  );
}

export default SearchFilter;
