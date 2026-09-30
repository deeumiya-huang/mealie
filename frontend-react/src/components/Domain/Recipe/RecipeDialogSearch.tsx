import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import LinearProgress from "@mui/material/LinearProgress";
import TextField from "@mui/material/TextField";
import Toolbar from "@mui/material/Toolbar";
import { useLocation, useNavigate, useParams } from "react-router";
import { icons } from "~/lib/icons";
import type { RecipeSummary } from "~/lib/api/types/recipe";
import { useUserApi } from "~/hooks/api";
import { usePublicExploreApi } from "~/hooks/api/api-client";
import { useDisplay } from "~/hooks/use-display";
import { useI18n } from "~/hooks/use-global-i18n";
import { useLoggedInState } from "~/hooks/use-logged-in-state";
import { useMealieAuth } from "~/hooks/use-mealie-auth";
import { useRecipeSearch } from "~/hooks/recipes/use-recipe-search";
import { Icon } from "~/components/global/Icon";
import { RecipeCardMobile } from "./RecipeCardMobile";

export interface RecipeDialogSearchHandle {
  open: () => void;
  close: () => void;
}

export interface RecipeDialogSearchProps {
  /** When provided, choosing a recipe calls this instead of navigating to it. */
  onSelected?: (recipe: RecipeSummary) => void;
  /** Activator render prop (the Vue default slot). */
  children?: (props: RecipeDialogSearchHandle) => ReactNode;
}

export const RecipeDialogSearch = forwardRef<RecipeDialogSearchHandle, RecipeDialogSearchProps>(function RecipeDialogSearch({ onSelected, children }, ref) {
  const i18n = useI18n();
  const auth = useMealieAuth();
  const display = useDisplay();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const groupSlug = params.groupSlug || auth.user?.groupSlug || "";
  const [dialog, setDialog] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Basic Search
  const { isOwnGroup } = useLoggedInState();
  const userApi = useUserApi();
  const exploreApi = usePublicExploreApi(groupSlug).explore;
  const search = useRecipeSearch(isOwnGroup ? userApi : exploreApi);

  const open = useCallback(() => setDialog(true), []);
  const close = useCallback(() => setDialog(false), []);
  useImperativeHandle(ref, () => ({ open, close }), [open, close]);

  // Reset on close
  useEffect(() => {
    if (!dialog) {
      search.setQuery("");
      setSelectedIndex(-1);
      search.setData([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when the dialog closes
  }, [dialog]);

  // Close on navigation
  useEffect(() => {
    close();
  }, [location.pathname, location.search, close]);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [search.data]);

  const scrollContainer = useRef<HTMLDivElement>(null);

  const handleSelect = useCallback((recipe: RecipeSummary) => {
    close();
    onSelected?.(recipe);
  }, [close, onSelected]);

  const activateRecipe = useCallback((recipe: RecipeSummary | undefined) => {
    if (!recipe) return;
    if (onSelected) {
      handleSelect(recipe);
      return;
    }
    if (!recipe.slug) return;
    close();
    void navigate(`/g/${groupSlug}/r/${recipe.slug}`);
  }, [onSelected, handleSelect, close, navigate, groupSlug]);

  // Keyboard navigation while open
  const latest = useRef({ data: search.data, selectedIndex, activateRecipe });
  latest.current = { data: search.data, selectedIndex, activateRecipe };
  useEffect(() => {
    if (!dialog) return;
    function onSearchKeydown(e: KeyboardEvent) {
      if (e.isComposing) return;
      const { data, selectedIndex: current, activateRecipe: activate } = latest.current;
      if (e.key === "Enter") {
        e.preventDefault();
        activate(data[Math.max(current, 0)]);
      }
      else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        const change = e.key === "ArrowUp" ? -1 : 1;
        setSelectedIndex(Math.min(Math.max(current + change, -1), data.length - 1));
      }
    }
    document.addEventListener("keydown", onSearchKeydown);
    return () => document.removeEventListener("keydown", onSearchKeydown);
  }, [dialog]);

  useEffect(() => {
    if (selectedIndex < 0) return;
    const cards = scrollContainer.current?.getElementsByClassName("arrow-nav");
    cards?.[selectedIndex]?.scrollIntoView({ block: "center" });
  }, [selectedIndex]);

  return (
    <div>
      {children?.({ open, close })}
      <Dialog
        open={dialog}
        onClose={close}
        maxWidth={false}
        slotProps={{ paper: { sx: { width: "100%", maxWidth: "988px", position: "fixed", top: 0, borderRadius: display.xs ? 0 : undefined } } }}
      >
        <Card>
          {search.loading && <LinearProgress />}
          <Toolbar sx={{ bgcolor: "primary.light", gap: 1 }}>
            <TextField
              id="arrow-search"
              value={search.query}
              onChange={e => search.setQuery(e.target.value)}
              autoFocus
              autoComplete="off"
              fullWidth
              size="small"
              variant="outlined"
              placeholder={i18n.t("search.search")}
              className="arrow-search"
              sx={{ mx: 1, "& .MuiOutlinedInput-root": { bgcolor: "primary.light", color: "#fff" }, "& fieldset": { border: "none" } }}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><Icon path={icons.search} color="white" /></InputAdornment> } }}
            />
            {display.xs && (
              <IconButton size="small" onClick={close} sx={{ color: "#fff" }}>
                <Icon path={icons.close} />
              </IconButton>
            )}
          </Toolbar>
          <CardActions>
            <Box sx={{ mr: "auto" }}>{i18n.t("search.results")}</Box>
          </CardActions>
          <Box ref={scrollContainer} sx={{ overflowY: "auto", p: 0.5, maxHeight: 700 }}>
            {search.data.map((recipe, index) => (
              <Box
                key={index}
                sx={index === selectedIndex ? { outline: 2, outlineColor: "primary.main", outlineStyle: "solid", borderRadius: 1, m: 0.5 } : { m: 0.5 }}
              >
                <RecipeCardMobile
                  className={["arrow-nav", index === selectedIndex ? "keyboard-selected" : ""].filter(Boolean).join(" ")}
                  name={recipe.name ?? ""}
                  description={recipe.description ?? ""}
                  slug={recipe.slug ?? ""}
                  rating={recipe.rating ?? 0}
                  image={recipe.image}
                  recipeId={recipe.id ?? ""}
                  onSelected={onSelected ? () => handleSelect(recipe) : undefined}
                />
              </Box>
            ))}
          </Box>
        </Card>
      </Dialog>
    </div>
  );
});

export default RecipeDialogSearch;
