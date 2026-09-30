import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { Link as RouterLink, useNavigate, useParams } from "react-router";
import { icons } from "~/lib/icons";
import { useDisplay } from "~/hooks/use-display";
import { useI18n } from "~/hooks/use-global-i18n";
import { useLoggedInState } from "~/hooks/use-logged-in-state";
import { useMealieAuth } from "~/hooks/use-mealie-auth";
import { Icon } from "~/components/global/Icon";
import { RecipeDialogSearch } from "~/components/Domain/Recipe/RecipeDialogSearch";
import type { RecipeDialogSearchHandle } from "~/components/Domain/Recipe/RecipeDialogSearch";

export const APP_BAR_HEIGHT = 48;

export function AppHeader({ menu = true, children }: { menu?: boolean; children?: ReactNode }) {
  const i18n = useI18n();
  const auth = useMealieAuth();
  const { loggedIn } = useLoggedInState();
  const params = useParams();
  const navigate = useNavigate();
  const { xs, smAndUp } = useDisplay();
  const groupSlug = params.groupSlug || auth.user?.groupSlug || "";
  const routerLink = groupSlug ? `/g/${groupSlug}` : "/";
  const domSearchDialog = useRef<RecipeDialogSearchHandle>(null);

  const activateSearch = () => domSearchDialog.current?.open();

  useEffect(() => {
    function handleKeyEvent(e: KeyboardEvent) {
      const activeTag = document.activeElement?.tagName;
      if (e.key === "/" && activeTag !== "INPUT" && activeTag !== "TEXTAREA") {
        e.preventDefault();
        activateSearch();
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
    <AppBar position="fixed" color="primary" className="d-print-none" sx={{ zIndex: 2010 }} elevation={4}>
      <Toolbar variant="dense" sx={{ minHeight: APP_BAR_HEIGHT, gap: 0.5 }}>
        {children}
        <IconButton component={RouterLink} to={routerLink} sx={{ color: "#fff" }}>
          <Icon path={icons.primary} size={40} />
        </IconButton>
        <Box sx={{ pl: 1 }}>
          <Typography variant="h6" component="div" sx={{ cursor: "pointer" }} onClick={() => void navigate(routerLink)}>
            Mealie
          </Typography>
        </Box>
        <RecipeDialogSearch ref={domSearchDialog} />
        <Box sx={{ flex: 1 }} />
        {menu && (
          <>
            {!xs
              ? (
                  <Box sx={{ maxWidth: 250, width: 250 }} onClick={activateSearch}>
                    <TextField
                      size="small"
                      fullWidth
                      placeholder={i18n.t("search.search-hint")}
                      slotProps={{
                        input: {
                          readOnly: true,
                          startAdornment: <InputAdornment position="start"><Icon path={icons.search} color="white" /></InputAdornment>,
                          sx: theme => ({ borderRadius: 6, bgcolor: alpha(theme.palette.common.black, 0.15), color: "#fff", "& fieldset": { border: "none" } }),
                        },
                      }}
                    />
                  </Box>
                )
              : (
                  <IconButton onClick={activateSearch} sx={{ color: "#fff" }}>
                    <Icon path={icons.search} />
                  </IconButton>
                )}
            {loggedIn
              ? (
                  smAndUp
                    ? (
                        <Button color="inherit" variant="text" onClick={() => void logout()} startIcon={<Icon path={icons.logout} />}>
                          {i18n.t("user.logout")}
                        </Button>
                      )
                    : (
                        <IconButton color="inherit" onClick={() => void logout()}><Icon path={icons.logout} /></IconButton>
                      )
                )
              : (
                  <Button color="inherit" variant="text" component={RouterLink} to="/login" startIcon={<Icon path={icons.user} />}>
                    {i18n.t("user.login")}
                  </Button>
                )}
          </>
        )}
      </Toolbar>
    </AppBar>
  );
}

export default AppHeader;
