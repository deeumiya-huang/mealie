import { useState } from "react";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import type { SxProps, Theme } from "@mui/material/styles";
import { icons } from "~/lib/icons";
import { useI18n } from "~/hooks/use-global-i18n";
import { BaseDialog } from "~/components/global/BaseDialog";
import { Icon } from "~/components/global/Icon";
import { RecipeTimeline } from "./RecipeTimeline";

export function RecipeTimelineBadge({ buttonStyle = false, slug = "", sx }: { buttonStyle?: boolean; slug?: string; recipeName?: string; sx?: SxProps<Theme> }) {
  const i18n = useI18n();
  const [showTimeline, setShowTimeline] = useState(false);
  return (
    <>
      <Tooltip title={i18n.t("recipe.open-timeline")} placement="bottom">
        <IconButton
          size="small"
          onClick={(e) => {
            e.preventDefault();
            setShowTimeline(!showTimeline);
          }}
          sx={[
            buttonStyle ? { bgcolor: "info.main", color: "#fff", "&:hover": { bgcolor: "info.dark" } } : { color: "secondary.main" },
            ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
          ]}
        >
          <Icon path={icons.timelineText} size={buttonStyle ? "x-large" : undefined} />
        </IconButton>
      </Tooltip>
      <BaseDialog open={showTimeline} onOpenChange={setShowTimeline} title={i18n.t("recipe.timeline")} icon={icons.timelineText} width="70%">
        {showTimeline && <RecipeTimeline open={showTimeline} queryFilter={`recipe.slug="${slug}"`} />}
      </BaseDialog>
    </>
  );
}

export default RecipeTimelineBadge;
