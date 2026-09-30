import Button from "@mui/material/Button";
import { icons } from "~/lib/icons";
import { useI18n } from "~/hooks/use-global-i18n";
import { Icon } from "./Icon";

export function DocLink({ link }: { link: string }) {
  const i18n = useI18n();
  // TODO: dynamically set docs link based off env
  const href = `https://docs.mealie.io${link}`;
  return (
    <Button size="small" variant="contained" color="primary" href={href} target="_blank" startIcon={<Icon path={icons.folderOutline} size="small" />}>
      {i18n.t("about.docs")}
    </Button>
  );
}

export default DocLink;
