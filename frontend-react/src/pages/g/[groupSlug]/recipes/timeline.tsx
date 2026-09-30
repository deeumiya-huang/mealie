import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import { BasePageTitle, BasePageTitleImage } from "~/components/global/BasePageTitle";
import { RecipeTimeline } from "~/components/Domain/Recipe/RecipeTimeline";
import { useUserApi } from "~/hooks/api";
import { useDisplay } from "~/hooks/use-display";
import { useI18n } from "~/hooks/use-global-i18n";
import { useSeoMeta } from "~/hooks/use-seo-meta";

export default function GroupTimelinePage() {
  const i18n = useI18n();
  const api = useUserApi();
  const display = useDisplay();
  const [groupName, setGroupName] = useState("");
  const [queryFilter, setQueryFilter] = useState("");
  const [ready, setReady] = useState(false);

  useSeoMeta({ title: i18n.t("recipe.timeline") });

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data } = await api.households.getCurrentUserHousehold();
      if (!active) return;
      if (data) {
        setQueryFilter(`recipe.group_id="${data.groupId}"`);
        setGroupName(data.group);
      }
      setReady(true);
    })();
    return () => {
      active = false;
    };
  }, [api]);

  return (
    <div>
      {groupName && (
        <Box sx={{ mt: -2, pt: 4 }}>
          <BasePageTitle
            header={<BasePageTitleImage src="/svgs/manage-members.svg" />}
            title={i18n.t("recipe.group-global-timeline", { groupName })}
          />
        </Box>
      )}
      <Box sx={{ px: display.smAndDown ? 0 : 1.5, py: 0, backgroundColor: "transparent" }}>
        {queryFilter && <RecipeTimeline open={ready} showRecipeCards queryFilter={queryFilter} />}
      </Box>
    </div>
  );
}
