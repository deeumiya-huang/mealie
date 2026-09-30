import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Popover from "@mui/material/Popover";
import { icons } from "~/lib/icons";
import { useDisplay } from "~/hooks/use-display";
import { useI18n } from "~/hooks/use-global-i18n";
import { useRecipeExplorerSearch } from "~/hooks/use-recipe-explorer-search";
import { Icon } from "~/components/global/Icon";
import { SwitchInput, TextInput } from "~/components/global/form";
import { RecipeExplorerPageSearchFilters } from "./RecipeExplorerPageSearchFilters";

export function RecipeExplorerPageSearch({ onReady }: { onReady?: () => void }) {
  const i18n = useI18n();
  const display = useDisplay();
  const { state, setState, search, reset, toggleOrderDirection, setOrderBy, setRandomOrderBy, initialize } = useRecipeExplorerSearch();
  const [showRandomLoading, setShowRandomLoading] = useState(false);
  const [sortAnchor, setSortAnchor] = useState<HTMLElement | null>(null);
  const [settingsAnchor, setSettingsAnchor] = useState<HTMLElement | null>(null);
  const input = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    void initialize().then(() => onReady?.());
  // eslint-disable-next-line react-hooks/exhaustive-deps -- onMounted
  }, []);

  const sortable = [
    { icon: icons.orderAlphabeticalAscending, name: i18n.t("general.sort-alphabetically"), value: "name" },
    { icon: icons.newBox, name: i18n.t("general.created"), value: "created_at" },
    { icon: icons.chefHat, name: i18n.t("general.last-made"), value: "last_made" },
    { icon: icons.star, name: i18n.t("general.rating"), value: "rating" },
    { icon: icons.update, name: i18n.t("general.updated"), value: "updated_at" },
    { icon: icons.diceMultiple, name: i18n.t("general.random"), value: "random" },
  ];
  const sortText = sortable.find(s => s.value === state.orderBy)?.name ?? "";

  return (
    <Box sx={{ display: "flex", justifyContent: "center", pb: 4 }}>
      <Box
        component="form"
        sx={{ width: 950, maxWidth: "100%", p: 1 }}
        onSubmit={(e) => {
          e.preventDefault();
          void search();
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "center", mb: 1 }}>
          <TextInput
            inputRef={input}
            value={state.search}
            onChange={v => setState({ search: v })}
            hideDetails
            clearable
            placeholder={i18n.t("search.search-placeholder")}
            prependInnerIcon={icons.search}
            onKeyDown={(e) => {
              if (e.key === "Enter") input.current?.blur();
            }}
          />
        </Box>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: "0.65rem", mt: 2 }}>
          <RecipeExplorerPageSearchFilters />
          <Button
            sx={{ ml: "auto" }}
            size="small"
            color="accent"
            variant="contained"
            onClick={e => setSortAnchor(e.currentTarget)}
            startIcon={!display.xs ? <Icon path={state.orderDirection === "asc" ? icons.sortDescending : icons.sortAscending} /> : undefined}
          >
            {display.xs ? <Icon path={state.orderDirection === "asc" ? icons.sortDescending : icons.sortAscending} /> : sortText}
          </Button>
          <Menu anchorEl={sortAnchor} open={!!sortAnchor} onClose={() => setSortAnchor(null)}>
            <MenuItem dense onClick={() => toggleOrderDirection()}>
              <ListItemIcon><Icon path={state.orderDirection === "asc" ? icons.sortAscending : icons.sortDescending} /></ListItemIcon>
              <ListItemText>{state.orderDirection === "asc" ? i18n.t("general.sort-descending") : i18n.t("general.sort-ascending")}</ListItemText>
            </MenuItem>
            <Divider />
            {sortable.map(v => (
              <MenuItem
                key={v.name}
                dense
                selected={state.orderBy === v.value}
                onClick={() => {
                  if (v.value === "random") {
                    setShowRandomLoading(true);
                    setRandomOrderBy();
                  }
                  else {
                    setOrderBy(v.value);
                  }
                }}
              >
                <ListItemIcon><Icon path={v.icon} /></ListItemIcon>
                <ListItemText>{v.name}</ListItemText>
                {v.value === "random" && showRandomLoading && <Icon path={icons.refreshCircle} size="small" sx={{ ml: 1.5 }} />}
              </MenuItem>
            ))}
          </Menu>

          <Button size="small" color="accent" variant="contained" onClick={e => setSettingsAnchor(e.currentTarget)}>
            <Icon path={icons.cog} size="small" />
          </Button>
          <Popover open={!!settingsAnchor} anchorEl={settingsAnchor} onClose={() => setSettingsAnchor(null)} anchorOrigin={{ vertical: "bottom", horizontal: "left" }}>
            <Card>
              <CardContent>
                <SwitchInput checked={state.auto} onChange={auto => setState({ auto })} label={i18n.t("search.auto-search")} color="primary" />
                <Button fullWidth variant="contained" color="primary" onClick={reset}>{i18n.t("general.reset")}</Button>
              </CardContent>
            </Card>
          </Popover>
        </Box>
        {!state.auto && (
          <Box sx={{ mt: 6, mx: "auto", maxWidth: 500 }}>
            <Button size="large" color="primary" variant="contained" type="submit" fullWidth startIcon={<Icon path={icons.search} />}>
              {i18n.t("search.search")}
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default RecipeExplorerPageSearch;
