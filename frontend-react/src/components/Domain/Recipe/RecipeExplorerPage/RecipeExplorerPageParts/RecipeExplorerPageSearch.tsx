// Usage: <RecipeExplorerPageSearch onReady={() => setReady(true)} /> — the search box, filter buttons, sort menu and
// settings menu of the recipe explorer. It owns the shared explorer search state (`useRecipeExplorerSearch`): it
// restores it from the URL / session on mount (then calls `onReady`) and drops it again when it unmounts. The Vue
// component exposed `passedQueryWithSeed` / `filterItems` through a ref; here the parent reads them from the same hook.
import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Popover from "@mui/material/Popover";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import { useParams } from "react-router";
import { MdiIcon } from "@/components/global/MdiIcon";
import {
  cancelRecipeExplorerSearchStateClear,
  scheduleRecipeExplorerSearchStateClear,
  useRecipeExplorerSearch,
  useRecipeExplorerSearchEffects,
} from "@/hooks/use-recipe-explorer-search";
import { useMealieAuth } from "@/hooks/use-mealie-auth";
import { useDisplay } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import { icons } from "@/lib/icons";
import { RecipeExplorerPageSearchFilters } from "./RecipeExplorerPageSearchFilters";

interface RecipeExplorerPageSearchProps {
  onReady?: () => void;
}

export function RecipeExplorerPageSearch({ onReady }: RecipeExplorerPageSearchProps) {
  const auth = useMealieAuth();
  const params = useParams();
  const { t } = useI18n();
  const { xs } = useDisplay();
  const [showRandomLoading, setShowRandomLoading] = useState(false);
  const [sortAnchor, setSortAnchor] = useState<HTMLElement | null>(null);
  const [settingsAnchor, setSettingsAnchor] = useState<HTMLElement | null>(null);

  const groupSlug = params.groupSlug || auth.user?.groupSlug || "";

  const {
    state,
    setState,
    search,
    reset,
    toggleOrderDirection,
    setOrderBy,
    setRandomOrderBy,
    initialize,
  } = useRecipeExplorerSearch(groupSlug);
  useRecipeExplorerSearchEffects(groupSlug);

  const latest = useRef({ initialize, onReady });
  useEffect(() => {
    latest.current = { initialize, onReady };
  });

  useEffect(() => {
    cancelRecipeExplorerSearchStateClear(groupSlug);
    let cancelled = false;
    void latest.current.initialize().then(() => {
      if (!cancelled) {
        latest.current.onReady?.();
      }
    });

    return () => {
      cancelled = true;
      // Clear the cache when component unmounts to ensure fresh state on remount
      scheduleRecipeExplorerSearchStateClear(groupSlug);
    };
  }, [groupSlug]);

  const sortable = [
    {
      icon: icons.orderAlphabeticalAscending,
      name: t("general.sort-alphabetically"),
      value: "name",
    },
    {
      icon: icons.newBox,
      name: t("general.created"),
      value: "created_at",
    },
    {
      icon: icons.chefHat,
      name: t("general.last-made"),
      value: "last_made",
    },
    {
      icon: icons.star,
      name: t("general.rating"),
      value: "rating",
    },
    {
      icon: icons.update,
      name: t("general.updated"),
      value: "updated_at",
    },
    {
      icon: icons.diceMultiple,
      name: t("general.random"),
      value: "random",
    },
  ];

  const sortText = sortable.find(s => s.value === state.orderBy)?.name ?? "";

  // function to show refresh icon
  function setRandomOrderByWrapper() {
    if (!showRandomLoading) {
      setShowRandomLoading(true);
    }
    setRandomOrderBy();
  }

  return (
    <Box sx={{ display: "flex", justifyContent: "center", pb: 4 }}>
      <Box
        component="form"
        sx={{ width: 950, maxWidth: "100%", p: 1 }}
        onSubmit={(event) => {
          event.preventDefault();
          void search();
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "center", mb: 1 }}>
          <TextField
            fullWidth
            variant="outlined"
            color="primary"
            value={state.search}
            placeholder={t("search.search-placeholder")}
            onChange={event => setState({ search: event.target.value })}
            onKeyUp={(event) => {
              if (event.key === "Enter") {
                (event.target as HTMLElement).blur();
              }
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <MdiIcon path={icons.search} />
                  </InputAdornment>
                ),
                endAdornment: state.search
                  ? (
                      <InputAdornment position="end">
                        <IconButton size="small" edge="end" aria-label={t("general.clear")} onClick={() => setState({ search: "" })}>
                          <MdiIcon path={icons.close} size="small" />
                        </IconButton>
                      </InputAdornment>
                    )
                  : undefined,
              },
            }}
          />
        </Box>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: "0.65rem", mt: "1rem" }}>
          <RecipeExplorerPageSearchFilters />
          {/* Sort Options */}
          <Button
            size="small"
            variant="contained"
            color="accent"
            sx={{ ml: "auto" }}
            aria-haspopup="menu"
            aria-expanded={sortAnchor !== null}
            startIcon={xs ? undefined : <MdiIcon path={state.orderDirection === "asc" ? icons.sortDescending : icons.sortAscending} />}
            onClick={event => setSortAnchor(event.currentTarget)}
          >
            {xs ? <MdiIcon path={state.orderDirection === "asc" ? icons.sortDescending : icons.sortAscending} /> : sortText}
          </Button>
          <Menu
            anchorEl={sortAnchor}
            open={sortAnchor !== null}
            onClose={() => setSortAnchor(null)}
            slotProps={{ paper: { sx: { mt: 0.375 } } }}
          >
            <MenuItem
              dense
              onClick={() => {
                toggleOrderDirection();
                setSortAnchor(null);
              }}
            >
              <ListItemIcon>
                <MdiIcon path={state.orderDirection === "asc" ? icons.sortAscending : icons.sortDescending} />
              </ListItemIcon>
              <ListItemText>
                {state.orderDirection === "asc" ? t("general.sort-descending") : t("general.sort-ascending")}
              </ListItemText>
            </MenuItem>
            <Divider />
            {sortable.map(v => (
              <MenuItem
                key={v.name}
                dense
                selected={state.orderBy === v.value}
                // choosing a sort keeps the menu open (Vue: `@click.stop`)
                onClick={() => (v.value === "random" ? setRandomOrderByWrapper() : setOrderBy(v.value))}
              >
                <ListItemIcon>
                  <MdiIcon path={v.icon} />
                </ListItemIcon>
                <ListItemText>
                  <span>{v.name}</span>
                  {v.value === "random" && showRandomLoading && (
                    <MdiIcon path={icons.refreshCircle} size="small" sx={{ ml: 1.5 }} />
                  )}
                </ListItemText>
              </MenuItem>
            ))}
          </Menu>

          {/* Settings */}
          <Button
            size="small"
            variant="contained"
            color="accent"
            aria-haspopup="dialog"
            aria-expanded={settingsAnchor !== null}
            onClick={event => setSettingsAnchor(event.currentTarget)}
          >
            <MdiIcon path={icons.cog} size="small" />
          </Button>
          <Popover
            anchorEl={settingsAnchor}
            open={settingsAnchor !== null}
            onClose={() => setSettingsAnchor(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
            slotProps={{ paper: { sx: { mt: 0.375 } } }}
          >
            <Card elevation={0}>
              <CardContent>
                <FormControlLabel
                  control={(
                    <Switch
                      color="primary"
                      checked={state.auto}
                      onChange={event => setState({ auto: event.target.checked })}
                    />
                  )}
                  label={t("search.auto-search")}
                  sx={{ display: "flex" }}
                />
                <Button fullWidth variant="contained" color="primary" onClick={reset}>
                  {t("general.reset")}
                </Button>
              </CardContent>
            </Card>
          </Popover>
        </Box>
        {!state.auto && (
          <Box sx={{ m: "3rem auto 0 auto", maxWidth: 500 }}>
            <Button
              fullWidth
              size="large"
              variant="contained"
              color="primary"
              type="submit"
              startIcon={<MdiIcon path={icons.search} />}
              sx={{ py: 1.5, fontSize: "1rem" }}
            >
              {t("search.search")}
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
}
