// Usage: <RecipeTimelineBadge slug={recipe.slug} recipeName={recipe.name} buttonStyle />
// A timeline icon button (tooltip "open timeline") that opens a dialog with the timeline of events of that recipe.
import { useState } from "react";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import type { SxProps, Theme } from "@mui/material/styles";
import { BaseDialog } from "@/components/global/BaseDialog";
import { MdiIcon } from "@/components/global/MdiIcon";
import { useI18n } from "@/i18n";
import { icons } from "@/lib/icons";
import { RecipeTimeline } from "./RecipeTimeline";

interface RecipeTimelineBadgeProps {
  buttonStyle?: boolean;
  slug?: string;
  recipeName?: string;
  className?: string;
  sx?: SxProps<Theme>;
}

export function RecipeTimelineBadge({ buttonStyle = false, slug = "", className, sx }: RecipeTimelineBadgeProps) {
  const { t } = useI18n();
  const [showTimeline, setShowTimeline] = useState(false);

  const queryFilter = `recipe.slug="${slug}"`;
  const tooltipColor = buttonStyle ? "info.main" : "secondary.main";

  return (
    <>
      <Tooltip
        title={t("recipe.open-timeline")}
        placement="bottom"
        slotProps={{ tooltip: { sx: { bgcolor: tooltipColor, color: "#fff" } }, arrow: { sx: { color: tooltipColor } } }}
      >
        <IconButton
          size="small"
          color={buttonStyle ? "info" : "secondary"}
          className={className}
          sx={[
            buttonStyle && { "bgcolor": "info.main", "&:hover": { bgcolor: "info.dark" } },
            ...(Array.isArray(sx) ? sx : [sx]),
          ]}
          onClick={(event) => {
            event.preventDefault();
            setShowTimeline(current => !current);
          }}
        >
          <MdiIcon
            path={icons.timelineText}
            size={buttonStyle ? "x-large" : "default"}
            sx={{ color: buttonStyle ? "#fff" : "secondary.main" }}
          />
        </IconButton>
      </Tooltip>
      <BaseDialog
        open={showTimeline}
        onOpenChange={setShowTimeline}
        title={t("recipe.timeline")}
        icon={icons.timelineText}
        width="70%"
      >
        <RecipeTimeline open={showTimeline} queryFilter={queryFilter} />
      </BaseDialog>
    </>
  );
}
