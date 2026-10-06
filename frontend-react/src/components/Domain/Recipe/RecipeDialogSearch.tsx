// Usage: const ref = useRef<RecipeDialogSearchHandle>(null);  <RecipeDialogSearch ref={ref} />  …  ref.current?.open()
//   <RecipeDialogSearch onSelected={recipe => …}>{({ open }) => <Button onClick={open} />}</RecipeDialogSearch>
// The recipe search dialog: type to search, arrow keys move the highlight, Enter opens the highlighted (or first)
// recipe — or, when `onSelected` is given, reports it instead of navigating. `ref` exposes `open()` / `close()`
// (Vue `defineExpose`); `children` as a function is the Vue default slot `{ open, close }`.
import { useCallback, useEffect, useImperativeHandle, useState, type ReactNode, type Ref } from "react";
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
import { MdiIcon } from "@/components/global/MdiIcon";
import { useUserApi } from "@/hooks/api";
import { usePublicExploreApi } from "@/hooks/api/api-client";
import { useRecipeSearch } from "@/hooks/recipes/use-recipe-search";
import { useLoggedInState } from "@/hooks/use-logged-in-state";
import { useMealieAuth } from "@/hooks/use-mealie-auth";
import { useDisplay } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import type { Recipe, RecipeSummary } from "@/lib/api/types/recipe";
import { icons } from "@/lib/icons";
import { RecipeCardMobile } from "./RecipeCardMobile";

export interface RecipeDialogSearchHandle {
  open: () => void;
  close: () => void;
}

interface RecipeDialogSearchProps {
  ref?: Ref<RecipeDialogSearchHandle>;
  children?: ReactNode | ((slot: RecipeDialogSearchHandle) => ReactNode);
  onSelected?: (recipe: RecipeSummary) => void;
}

// Shown in place of the results the dialog was closed on (Vue emptied the list).
const NO_RECIPES: Recipe[] = [];

export function RecipeDialogSearch({ ref, children, onSelected }: RecipeDialogSearchProps) {
  const { t } = useI18n();
  const auth = useMealieAuth();
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();
  const { xs } = useDisplay();
  const { isOwnGroup } = useLoggedInState();

  const groupSlug = params.groupSlug || auth.user?.groupSlug || "";

  // ===========================================================================
  // Basic Search
  const userApi = useUserApi();
  const exploreApi = usePublicExploreApi(groupSlug).explore;
  const search = useRecipeSearch(isOwnGroup ? userApi : exploreApi);

  // ===========================================================================
  // Dialog State Management
  const [dialog, setDialog] = useState(false);
  // results that were on screen when the dialog closed stay hidden until a new search replaces them
  const [clearedData, setClearedData] = useState<Recipe[] | null>(null);
  const data = search.data === clearedData ? NO_RECIPES : search.data;

  // the highlighted result belongs to one result list; a new list starts without a highlight
  const [selection, setSelection] = useState<{ index: number; data: Recipe[] }>({ index: -1, data });
  const selectedIndex = selection.data === data ? selection.index : -1;

  const { data: searchData, setQuery } = search;

  const open = useCallback(() => setDialog(true), []);

  // Reset or Grab Recipes on Change: closing empties the query and the results
  const close = useCallback(() => {
    if (dialog) {
      setQuery("");
      setClearedData(searchData);
      setSelection({ index: -1, data: NO_RECIPES });
    }
    setDialog(false);
  }, [dialog, setQuery, searchData]);

  useImperativeHandle(ref, () => ({ open, close }), [open, close]);

  // Vue: watch(route, close)
  const [lastLocation, setLastLocation] = useState(location);
  if (lastLocation !== location) {
    setLastLocation(location);
    if (dialog) {
      setQuery("");
      setClearedData(searchData);
      setSelection({ index: -1, data: NO_RECIPES });
      setDialog(false);
    }
  }

  // ===========================================================================
  // Event Handlers

  // keep the highlighted card in view
  useEffect(() => {
    const recipeCards = document.getElementsByClassName("arrow-nav");

    if (!recipeCards.length || selectedIndex < 0 || selectedIndex >= recipeCards.length) {
      return;
    }

    recipeCards[selectedIndex]?.scrollIntoView({ block: "center" });
  }, [selectedIndex]);

  const handleSelect = useCallback((recipe: RecipeSummary) => {
    close();
    onSelected?.(recipe);
  }, [close, onSelected]);

  useEffect(() => {
    if (!dialog) {
      return;
    }

    function activateRecipe(recipe: RecipeSummary | undefined) {
      if (!recipe) {
        return;
      }

      if (onSelected) {
        handleSelect(recipe);
        return;
      }

      if (!recipe.slug) {
        return;
      }

      close();
      void navigate(`/g/${groupSlug}/r/${recipe.slug}`);
    }

    function selectRecipe(positionChange: number) {
      let next = selectedIndex + positionChange;
      next = Math.max(next, -1);
      next = Math.min(next, data.length - 1);
      setSelection({ index: next, data });
    }

    function onSearchKeydown(e: KeyboardEvent) {
      if (e.isComposing) {
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        const index = Math.max(selectedIndex, 0);
        activateRecipe(data[index]);
      }
      else if (e.key === "ArrowUp") {
        e.preventDefault();
        selectRecipe(-1);
      }
      else if (e.key === "ArrowDown") {
        e.preventDefault();
        selectRecipe(1);
      }
    }

    document.addEventListener("keydown", onSearchKeydown);
    return () => document.removeEventListener("keydown", onSearchKeydown);
  }, [dialog, data, selectedIndex, onSelected, handleSelect, close, groupSlug, navigate]);

  return (
    <div>
      {typeof children === "function" ? children({ open, close }) : children}
      <Dialog
        open={dialog}
        onClose={close}
        maxWidth={false}
        // content-class="top-dialog": the dialog hangs from the top of the screen
        sx={{ "& .MuiDialog-container": { alignItems: "flex-start" } }}
        slotProps={{ paper: { sx: { width: 988, maxWidth: "calc(100% - 48px)", m: 3, overflow: "visible", bgcolor: "transparent", boxShadow: "none" } } }}
      >
        <Card sx={{ borderRadius: xs ? 0 : undefined, position: "relative" }}>
          {search.loading && <LinearProgress sx={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 1 }} />}
          <Toolbar sx={{ bgcolor: "primary.light", color: "#fff", px: 0.5 }}>
            <TextField
              id="arrow-search"
              className="arrow-search"
              fullWidth
              autoFocus
              variant="outlined"
              size="small"
              value={search.query}
              onChange={event => search.setQuery(event.target.value)}
              placeholder={t("search.search")}
              autoComplete="off"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <MdiIcon path={icons.search} sx={{ color: "inherit" }} />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{
                "mx": 1,
                "bgcolor": "primary.light",
                "& .MuiOutlinedInput-root": { color: "#fff", boxShadow: "none" },
                "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                "& input::placeholder": { color: "#fff", opacity: 0.7 },
              }}
            />

            {xs && (
              <IconButton size="small" aria-label={t("general.close")} onClick={close} sx={{ color: "#fff" }}>
                <MdiIcon path={icons.close} />
              </IconButton>
            )}
          </Toolbar>

          <CardActions>
            <Box sx={{ mr: "auto" }}>
              {t("search.results")}
            </Box>
          </CardActions>

          <Box className="scroll" sx={{ overflowY: "auto", p: 0.5, maxHeight: 700 }}>
            {data.map((recipe, index) => (
              <RecipeCardMobile
                key={index}
                className={index === selectedIndex ? "ma-1 arrow-nav keyboard-selected" : "ma-1 arrow-nav"}
                name={recipe.name ?? ""}
                description={recipe.description ?? ""}
                slug={recipe.slug ?? ""}
                rating={recipe.rating ?? 0}
                image={recipe.image}
                recipeId={recipe.id ?? ""}
                onSelected={onSelected && (() => handleSelect(recipe))}
              />
            ))}
          </Box>
        </Card>
      </Dialog>
    </div>
  );
}
