// Usage: <AppFooter /> — primary-coloured footer with the GitHub link and the year.
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import { MdiIcon } from "@/components/global/MdiIcon";
import { useI18n } from "@/i18n";
import { icons } from "@/lib/icons";

export function AppFooter() {
  const { t } = useI18n();
  return (
    <Box component="footer" sx={{ bgcolor: "primary.main", color: "white" }}>
      <Box sx={{ py: 1, textAlign: "center" }}>
        <IconButton
          href="https://github.com/mealie-recipes/mealie"
          target="_blank"
          aria-label={t("about.github")}
          sx={{ color: "white" }}
        >
          <MdiIcon path={icons.github} />
        </IconButton>
        {new Date().getFullYear()}
        {" — "}
        <strong> Mealie </strong>
      </Box>
    </Box>
  );
}
