import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { icons } from "@/lib/icons";
import type { TimelineEventType } from "@/lib/api/types/recipe";

export interface TimelineEventTypeData {
  value: TimelineEventType;
  label: string;
  icon: string;
}

export const useTimelineEventTypes = () => {
  const i18n = useI18n();
  const eventTypeOptions = useMemo<TimelineEventTypeData[]>(() => {
    return [
      {
        value: "comment",
        label: i18n.t("recipe.comment"),
        icon: icons.commentTextMultiple,
      },
      {
        value: "info",
        label: i18n.t("settings.theme.info"),
        icon: icons.informationVariant,
      },
      {
        value: "system",
        label: i18n.t("general.system"),
        icon: icons.cog,
      },
    ];
  }, [i18n]);

  return {
    eventTypeOptions,
  };
};
