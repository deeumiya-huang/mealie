// Usage: <DocLink link="/documentation/getting-started/" /> — small "Docs" button opening docs.mealie.io in a new tab.
import Button from "@mui/material/Button";
import { useI18n } from "@/i18n";
import { icons } from "@/lib/icons";
import { MdiIcon } from "./MdiIcon";

export function DocLink({ link }: { link: string }) {
  const { t } = useI18n();
  const href = `https://docs.mealie.io${link}`;

  return (
    <Button
      size="small"
      variant="contained"
      color="primary"
      href={href}
      target="_blank"
      rel="noreferrer"
      startIcon={<MdiIcon path={icons.folderOutline} size="small" />}
      sx={{ fontSize: "0.625rem", py: 0, minHeight: 20 }}
    >
      {t("about.docs")}
    </Button>
  );
}
