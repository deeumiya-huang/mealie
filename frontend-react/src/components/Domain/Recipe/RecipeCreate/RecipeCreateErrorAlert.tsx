import type { ReactNode } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Collapse from "@mui/material/Collapse";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import { Icon } from "~/components/global/Icon";
import { BaseButton } from "~/components/global/BaseButton";
import { useI18n } from "~/hooks/use-global-i18n";
import { icons } from "~/lib/icons";

/** The error panel the create-recipe importers show when an import fails. */
export function RecipeCreateErrorAlert({ show, children }: { show: boolean; children: ReactNode }) {
  const i18n = useI18n();
  return (
    <Collapse in={show}>
      <Alert
        variant="filled"
        severity="error"
        icon={false}
        sx={{ "mt": 3, "color": "#fff", "& a": { color: "#fff !important" }, "& .MuiAlert-message": { width: "100%" } }}
      >
        <Typography variant="h6" sx={{ display: "flex", alignItems: "center", m: 0, p: 0 }}>
          <Icon path={icons.robot} size="x-large" start color="#fff" />
          {i18n.t("new-recipe.error-title")}
        </Typography>
        <Divider sx={{ my: 1.5, mx: 1, borderColor: "rgba(255,255,255,0.5)" }} />
        {children}
      </Alert>
    </Collapse>
  );
}

/** Links to the recipe markup references shown under import errors. */
export function RecipeCreateHelpLinks() {
  const i18n = useI18n();
  const links = [
    { href: "https://developers.google.com/search/docs/data-types/recipe", text: i18n.t("new-recipe.google-ld-json-info") },
    { href: "https://github.com/mealie-recipes/mealie/issues", text: i18n.t("new-recipe.github-issues") },
    { href: "https://schema.org/Recipe", text: i18n.t("new-recipe.recipe-markup-specification") },
  ];
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "space-around", my: 1.5, gap: 1 }}>
      {links.map(link => (
        <a key={link.href} href={link.href} target="_blank" rel="noreferrer nofollow">{link.text}</a>
      ))}
    </Box>
  );
}

/** The centered submit button with the streamed import status under it. */
export function RecipeCreateSubmit({ disabled, loading, status }: { disabled: boolean; loading: boolean; status?: string | null }) {
  return (
    <Box sx={{ width: "100%", textAlign: "center", p: 1 }}>
      <Box sx={{ width: 250, mx: "auto" }}>
        <SubmitButton disabled={disabled} loading={loading} />
      </Box>
      <Typography variant="body2" sx={{ py: 1 }}>
        {/* render &nbsp; to maintain layout */}
        {status}
        {" "}
      </Typography>
    </Box>
  );
}

function SubmitButton({ disabled, loading }: { disabled: boolean; loading: boolean }) {
  return <BaseButton type="submit" fullWidth disabled={disabled} loading={loading} />;
}
