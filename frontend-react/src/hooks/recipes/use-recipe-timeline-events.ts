import type { TimelineEventType } from "~/lib/api/types/recipe";
import { icons } from "~/lib/icons";
import { useI18n } from "~/hooks/use-global-i18n";

export interface TimelineEventTypeData {
  value: TimelineEventType;
  label: string;
  icon: string;
}

export const useTimelineEventTypes = () => {
  const i18n = useI18n();
  const eventTypeOptions: TimelineEventTypeData[] = [
    { value: "comment", label: i18n.t("recipe.comment"), icon: icons.commentTextMultiple },
    { value: "info", label: i18n.t("settings.theme.info"), icon: icons.informationVariant },
    { value: "system", label: i18n.t("general.system"), icon: icons.cog },
  ];
  return { eventTypeOptions };
};
