// Usage: <SearchFilter items={categories} value={selected} onChange={setSelected}
//          requireAll={requireAll} onRequireAllChange={setRequireAll}>{t("category.categories")}</SearchFilter>
// A button (with a badge showing how many are selected) that opens a popover to search and pick items, either
// as checkboxes or, with `radio`, a single choice (clicking the chosen one clears it). `requireAll` (when not
// undefined) adds the has-all / has-any toggle. Vue `v-model` → `value` + `onChange`,
// `v-model:require-all` → `requireAll` + `onRequireAllChange`, default slot → `children`.
// The Vue list is virtualised (300 px); here it is a plain scrolling list of the same height.
import { useState, type MouseEvent, type ReactNode } from "react";
import Alert from "@mui/material/Alert";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Popover from "@mui/material/Popover";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { MdiIcon } from "@/components/global/MdiIcon";
import { useSearch, type ISearchableItem } from "@/hooks/use-search";
import { useI18n } from "@/i18n";
import { icons } from "@/lib/icons";

interface SearchFilterProps<T extends ISearchableItem> {
  items: T[];
  value?: T[];
  onChange?: (value: T[]) => void;
  requireAll?: boolean;
  onRequireAllChange?: (requireAll: boolean | undefined) => void;
  radio?: boolean;
  children?: ReactNode;
}

export function SearchFilter<T extends ISearchableItem>({
  items,
  value,
  onChange,
  requireAll,
  onRequireAllChange,
  radio = false,
  children,
}: SearchFilterProps<T>) {
  const { t } = useI18n();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const { search: searchInput, setSearch: setSearchInput, filtered } = useSearch<T>(items);

  const selected = value ?? [];
  const selectedCount = selected.length;
  const selectedIds = new Set(selected.map(item => item.id));
  const selectedRadio = selected.length > 0 ? selected[0] : null;

  const combinator = requireAll ? "hasAll" : "hasAny";

  function handleRadioClick(item: T) {
    if (selectedRadio?.id === item.id) {
      onChange?.([]);
    }
  }

  function toggle(item: T, checked: boolean) {
    onChange?.(checked ? [...selected, item] : selected.filter(current => current.id !== item.id));
  }

  function clearSelection() {
    onChange?.([]);
    setSearchInput("");
  }

  return (
    <Box>
      <Badge badgeContent={selectedCount} invisible={selectedCount === 0} color="primary">
        <Button
          size="small"
          variant="contained"
          color="accent"
          aria-haspopup="dialog"
          aria-expanded={anchor !== null}
          onClick={(event: MouseEvent<HTMLElement>) => setAnchor(event.currentTarget)}
        >
          {children}
        </Button>
      </Badge>
      <Popover
        open={anchor !== null}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        slotProps={{ paper: { sx: { width: 400, maxWidth: "calc(100% - 16px)", mt: 0.375 } } }}
      >
        <Box sx={{ p: 2 }}>
          <TextField
            fullWidth
            variant="standard"
            label={t("search.search")}
            value={searchInput}
            onChange={event => setSearchInput(event.target.value)}
            sx={{ mb: 1 }}
            slotProps={{
              input: {
                endAdornment: searchInput
                  ? (
                      <InputAdornment position="end">
                        <IconButton size="small" aria-label={t("general.clear")} onClick={() => setSearchInput("")}>
                          <MdiIcon path={icons.close} size="small" />
                        </IconButton>
                      </InputAdornment>
                    )
                  : undefined,
              },
            }}
          />
          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", py: 2, px: 0.5 }}>
            {requireAll !== undefined && (
              <ToggleButtonGroup
                exclusive
                size="small"
                color="primary"
                value={combinator}
                onChange={(_event, next: string | null) => {
                  // mandatory: one of the two options always stays selected
                  if (next) onRequireAllChange?.(next === "hasAll");
                }}
                sx={{ my: 0.5 }}
              >
                <ToggleButton value="hasAll">{t("search.has-all")}</ToggleButton>
                <ToggleButton value="hasAny">{t("search.has-any")}</ToggleButton>
              </ToggleButtonGroup>
            )}
            <Box sx={{ flexGrow: 1 }} />
            <Button size="small" variant="contained" color="accent" sx={{ my: 0.5 }} onClick={clearSelection}>
              {t("search.clear-selection")}
            </Button>
          </Box>
          {filtered.length > 0
            ? (
                <Box sx={{ maxHeight: 300, overflowY: "auto", mt: radio ? 0 : 0.5 }}>
                  {radio
                    ? (
                        <RadioGroup value={selectedRadio?.id ?? ""}>
                          <List disablePadding>
                            {filtered.map(item => (
                              <Box key={`radio-${item.id}`}>
                                <ListItem>
                                  <FormControlLabel
                                    label={item.name}
                                    value={item.id}
                                    control={(
                                      <Radio
                                        color="primary"
                                        onClick={() => handleRadioClick(item)}
                                        onChange={() => onChange?.([item])}
                                      />
                                    )}
                                  />
                                </ListItem>
                                <Divider />
                              </Box>
                            ))}
                          </List>
                        </RadioGroup>
                      )
                    : (
                        <List disablePadding>
                          {filtered.map(item => (
                            <Box key={`checkbox-${item.id}`}>
                              <ListItem>
                                <FormControlLabel
                                  label={item.name}
                                  control={(
                                    <Checkbox
                                      color="primary"
                                      checked={selectedIds.has(item.id)}
                                      onChange={event => toggle(item, event.target.checked)}
                                    />
                                  )}
                                />
                              </ListItem>
                              <Divider />
                            </Box>
                          ))}
                        </List>
                      )}
                </Box>
              )
            : (
                <Alert severity="info" sx={{ mb: 0 }}>
                  {t("search.no-results")}
                </Alert>
              )}
        </Box>
      </Popover>
    </Box>
  );
}
