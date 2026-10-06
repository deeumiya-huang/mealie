// Usage: <AppHeader>{menuToggleButton}</AppHeader> · <AppHeader menu={false} /> — the top app bar: logo +
// "Mealie" (home of the current group), and with `menu` the login/logout button.
// The recipe search: a read-only field (≥ sm) or an icon button (xs) and the "/" key open RecipeDialogSearch.
import { useEffect, useRef, type ReactNode } from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import Toolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { Link, useNavigate, useParams } from "react-router";
import { RecipeDialogSearch, type RecipeDialogSearchHandle } from "@/components/Domain/Recipe/RecipeDialogSearch";
import { MdiIcon } from "@/components/global/MdiIcon";
import { useLoggedInState } from "@/hooks/use-logged-in-state";
import { useMealieAuth } from "@/hooks/use-mealie-auth";
import { useDisplay } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import { icons } from "@/lib/icons";

/** Height of the compact Vuetify app bar; layouts offset their content by it. */
export const APP_HEADER_HEIGHT = 48;

interface AppHeaderProps {
  menu?: boolean;
  children?: ReactNode;
}

export function AppHeader({ menu = true, children }: AppHeaderProps) {
  const { t } = useI18n();
  const auth = useMealieAuth();
  const { loggedIn } = useLoggedInState();
  const params = useParams();
  const navigate = useNavigate();
  const groupSlug = params.groupSlug || auth.user?.groupSlug || "";
  const { xs, smAndUp } = useDisplay();

  const routerLink = groupSlug ? `/g/${groupSlug}` : "/";
  const domSearchDialog = useRef<RecipeDialogSearchHandle>(null);

  function activateSearch() {
    domSearchDialog.current?.open();
  }

  useEffect(() => {
    function handleKeyEvent(e: KeyboardEvent) {
      const activeTag = document.activeElement?.tagName;
      if (e.key === "/" && activeTag !== "INPUT" && activeTag !== "TEXTAREA") {
        e.preventDefault();
        domSearchDialog.current?.open();
      }
    }

    document.addEventListener("keydown", handleKeyEvent);
    return () => document.removeEventListener("keydown", handleKeyEvent);
  }, []);

  async function logout() {
    try {
      await auth.signOut("/login?direct=1");
    }
    catch (e) {
      console.error(e);
    }
  }

  return (
    <AppBar
      position="fixed"
      color="primary"
      elevation={4}
      className="d-print-none"
      sx={{ zIndex: theme => theme.zIndex.drawer + 1, displayPrint: "none" }}
    >
      <Toolbar variant="dense" disableGutters sx={{ minHeight: APP_HEADER_HEIGHT, px: 0.5 }}>
        {children}
        <Link to={routerLink}>
          <IconButton sx={{ color: "white" }} tabIndex={-1}>
            <MdiIcon path={icons.primary} size={40} />
          </IconButton>
        </Link>

        <Box sx={{ pl: 1 }}>
          <Typography variant="h6" component="div" sx={{ cursor: "pointer" }} onClick={() => void navigate(routerLink)}>
            Mealie
          </Typography>
        </Box>

        <RecipeDialogSearch ref={domSearchDialog} />

        <Box sx={{ flexGrow: 1 }} />

        {/* Navigation Menu */}
        {menu && (xs
          ? (
              <IconButton color="inherit" aria-label={t("search.search")} onClick={activateSearch}>
                <MdiIcon path={icons.search} />
              </IconButton>
            )
          : (
              <Box sx={{ maxWidth: 250, width: "100%" }} onClick={activateSearch}>
                <TextField
                  fullWidth
                  size="small"
                  variant="filled"
                  hiddenLabel
                  placeholder={t("search.search-hint")}
                  slotProps={{
                    input: {
                      readOnly: true,
                      disableUnderline: true,
                      startAdornment: (
                        <InputAdornment position="start">
                          <MdiIcon path={icons.search} sx={{ color: "inherit" }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{
                    "mt": 0.5,
                    "& .MuiFilledInput-root": { "borderRadius": "28px", "bgcolor": "primary.dark", "color": "#fff", "&:hover, &.Mui-focused": { bgcolor: "primary.dark" } },
                    "& input::placeholder": { color: "#fff", opacity: 0.7 },
                    "& input": { cursor: "pointer" },
                  }}
                />
              </Box>
            ))}
        {menu && (
          loggedIn
            ? (
                xs
                  ? (
                      <Tooltip title={t("user.logout")}>
                        <IconButton color="inherit" onClick={() => void logout()}>
                          <MdiIcon path={icons.logout} />
                        </IconButton>
                      </Tooltip>
                    )
                  : (
                      <Button
                        color="inherit"
                        variant="text"
                        startIcon={smAndUp ? <MdiIcon path={icons.logout} /> : undefined}
                        onClick={() => void logout()}
                      >
                        {smAndUp ? t("user.logout") : ""}
                      </Button>
                    )
              )
            : (
                <Button color="inherit" variant="text" component={Link} to="/login" startIcon={<MdiIcon path={icons.user} />}>
                  {t("user.login")}
                </Button>
              )
        )}
      </Toolbar>
    </AppBar>
  );
}
