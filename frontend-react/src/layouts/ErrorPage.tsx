// Port of layouts/error.vue (Nuxt's error page): the 404 page for unknown URLs (catch-all route) and the
// error element of the root route. A 404 first tries the legacy URL rewrites Vue did: /group/{mealplan,
// members,notifiers,webhooks}… → /household/…, /recipe/ → /r/, and the current group slug prefix.
import { useEffect } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { isRouteErrorResponse, Link, useLocation, useNavigate, useRouteError } from "react-router";
import { MdiIcon } from "@/components/global/MdiIcon";
import { useMealieAuth } from "@/hooks/use-mealie-auth";
import { usePageTitle } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import { icons } from "@/lib/icons";

/** The URL a 404 should be replaced with, or null to show the page (Vue: handle404). */
function legacyRedirect(fullPath: string, groupSlug: string | undefined): string | null {
  const normalizedRoute = fullPath.replace(/\/$/, "");
  const newRoute = normalizedRoute.replace(/^\/group\/(mealplan|members|notifiers|webhooks)(\/.*)?$/, "/household/$1$2");

  if (newRoute !== normalizedRoute) {
    return newRoute;
  }

  // insertGroupSlugIntoRoute
  if (!groupSlug) {
    return null;
  }

  let replaceRoute = false;
  let routeVal = fullPath || "/";
  if (routeVal[0] !== "/") {
    routeVal = `/${routeVal}`;
  }

  // replace "recipe" in URL with "r"
  if (routeVal.includes("/recipe/")) {
    replaceRoute = true;
    routeVal = routeVal.replace("/recipe/", "/r/");
  }

  // insert groupSlug into URL
  const routeComponents = routeVal.split("/");
  if (routeComponents.length < 2 || routeComponents[1].toLowerCase() !== "g") {
    replaceRoute = true;
    routeVal = `/g/${groupSlug}${routeVal}`;
  }

  return replaceRoute ? routeVal : null;
}

export default function ErrorPage() {
  const i18n = useI18n();
  const auth = useMealieAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const error = useRouteError();

  // The catch-all route renders this without an error: an unknown URL.
  const statusCode = error === undefined ? 404 : isRouteErrorResponse(error) ? error.status : 500;
  if (error !== undefined && statusCode !== 404) {
    console.error(error);
  }

  const fullPath = `${location.pathname}${location.search}${location.hash}`;
  const redirectTo = statusCode === 404 ? legacyRedirect(fullPath, auth.user?.groupSlug) : null;

  useEffect(() => {
    if (redirectTo) {
      void navigate(redirectTo, { replace: true });
    }
  }, [redirectTo, navigate]);

  usePageTitle(statusCode === 404 ? i18n.t("page.404-not-found") : i18n.t("page.an-error-occurred"));

  const buttons = [
    { icon: icons.home, to: "/", text: i18n.t("general.home") },
  ];

  // Vue: not `ready` until the 404 handling decided not to redirect
  if (redirectTo) {
    return null;
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", color: "text.primary" }}>
      <Box sx={{ px: 2, pt: 2, pb: 1, display: "flex" }}>
        <Box component="h1" sx={{ mx: "auto", fontSize: "20px", fontWeight: 500, my: 0 }}>
          {i18n.t("page.404-page-not-found")}
        </Box>
      </Box>
      <Box sx={{ display: "flex", justifyContent: "space-around" }}>
        <Box sx={{ "display": "flex", "alignItems": "center", "color": "primary.main", "& p": { fontSize: "200px", m: 0, p: 0, lineHeight: 1.2 } }}>
          <p>4</p>
          <MdiIcon path={icons.primary} size={200} color="primary" sx={{ mx: "auto", mb: 0 }} />
          <p>4</p>
        </Box>
      </Box>
      <Box sx={{ display: "flex", justifyContent: "center", p: 1 }}>
        {buttons.map(button => (
          <Button
            key={button.to}
            component={Link}
            to={button.to}
            variant="contained"
            color="primary"
            startIcon={<MdiIcon path={button.icon} />}
          >
            {button.text}
          </Button>
        ))}
      </Box>
    </Box>
  );
}
