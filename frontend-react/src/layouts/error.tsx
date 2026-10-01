import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CardActions from "@mui/material/CardActions";
import Typography from "@mui/material/Typography";
import { Link as RouterLink, useLocation, useNavigate, useRouteError, isRouteErrorResponse } from "react-router";
import { icons } from "~/lib/icons";
import { useI18n } from "~/hooks/use-global-i18n";
import { useMealieAuth } from "~/hooks/use-mealie-auth";
import { Icon } from "~/components/global/Icon";
import { AppHeader, APP_BAR_HEIGHT } from "~/components/Layout/LayoutParts/AppHeader";

/**
 * Error page (Nuxt's layouts/error.vue). For a 404 it first tries the legacy URL rewrites
 * (/group/mealplan → /household/mealplan, /recipe/ → /r/, and inserting /g/<groupSlug>).
 */
export function ErrorPage({ statusCode = 404 }: { statusCode?: number }) {
  const i18n = useI18n();
  const auth = useMealieAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [ready, setReady] = useState(statusCode !== 404);

  useEffect(() => {
    document.title = statusCode === 404 ? i18n.t("page.404-not-found") : i18n.t("page.an-error-occurred");
  }, [statusCode, i18n]);

  useEffect(() => {
    if (statusCode !== 404) return;
    const fullPath = location.pathname + location.search + location.hash;
    const normalizedRoute = fullPath.replace(/\/$/, "");
    const newRoute = normalizedRoute.replace(/^\/group\/(mealplan|members|notifiers|webhooks)(\/.*)?$/, "/household/$1$2");

    if (newRoute !== normalizedRoute) {
      void navigate(newRoute, { replace: true });
      return;
    }

    const groupSlug = auth.user?.groupSlug;
    if (groupSlug) {
      let replaceRoute = false;
      let routeVal = fullPath || "/";
      if (routeVal[0] !== "/") routeVal = `/${routeVal}`;
      // replace "recipe" in URL with "r"
      if (routeVal.includes("/recipe/")) {
        replaceRoute = true;
        routeVal = routeVal.replace("/recipe/", "/r/");
      }
      // insert groupSlug into URL
      const routeComponents = routeVal.split("/");
      if (routeComponents.length < 2 || routeComponents[1]!.toLowerCase() !== "g") {
        replaceRoute = true;
        routeVal = `/g/${groupSlug}${routeVal}`;
      }
      if (replaceRoute) {
        void navigate(routeVal, { replace: true });
        return;
      }
    }
    setReady(true);
  }, [statusCode, location, navigate, auth.user?.groupSlug]);

  if (!ready) return null;

  return (
    <Box sx={{ pt: `${APP_BAR_HEIGHT}px` }}>
      <AppHeader menu={false} />
      <Typography component="h1" sx={{ fontSize: 20, textAlign: "center", p: 2 }}>
        {i18n.t("page.404-page-not-found")}
      </Typography>
      <Box sx={{ display: "flex", justifyContent: "space-around" }}>
        <Box sx={{ "display": "flex", "alignItems": "center", "color": "primary.main", "& p": { fontSize: 200, m: 0 } }}>
          <p>4</p>
          <Icon path={icons.primary} color="primary" size={200} sx={{ mx: "auto", mb: 0 }} />
          <p>4</p>
        </Box>
      </Box>
      <CardActions sx={{ justifyContent: "center" }}>
        <Button component={RouterLink} to="/" variant="contained" color="primary" startIcon={<Icon path={icons.home} />}>
          {i18n.t("general.home")}
        </Button>
      </CardActions>
    </Box>
  );
}

/** React Router error element: unknown routes and thrown errors. */
export default function RouteErrorBoundary() {
  const error = useRouteError();
  const status = isRouteErrorResponse(error) ? error.status : 500;
  if (status !== 404) console.error(error);
  return <ErrorPage statusCode={status} />;
}
