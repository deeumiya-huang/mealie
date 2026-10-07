import { useState } from "react";
import Box from "@mui/material/Box";
import { BaseImg } from "@/components/global/BaseImg";
import { BasePageTitle } from "@/components/global/BasePageTitle";
import { RecipeTimeline } from "@/components/Domain/Recipe/RecipeTimeline";
import { useUserApi } from "@/hooks/api";
import { useAsyncData, useDisplay, usePageTitle } from "@/hooks/utils";
import { useI18n } from "@/i18n";

export default function RecipeTimelinePage() {
  const { t } = useI18n();
  const api = useUserApi();
  const { smAndDown } = useDisplay();
  const [ready, setReady] = useState(false);

  usePageTitle(t("recipe.timeline"));

  const { data: household } = useAsyncData("house-hold", async () => {
    const { data } = await api.households.getCurrentUserHousehold();
    setReady(true);
    return data;
  });

  const groupName = household?.group ?? "";
  const queryFilter = household ? `recipe.group_id="${household.groupId}"` : "";

  return (
    <div>
      {groupName && (
        <Box sx={{ mt: -2, pt: 4 }}>
          <BasePageTitle
            header={<BaseImg width="100%" maxHeight={200} maxWidth={150} src="/svgs/manage-members.svg" />}
            title={t("recipe.group-global-timeline", { groupName })}
          />
        </Box>
      )}
      <Box sx={{ backgroundColor: "transparent", ...(smAndDown ? { p: 0 } : { px: 1.5, py: 0 }) }}>
        {/* mounted once the household request finished: with cached data it would otherwise load page 1 twice */}
        {queryFilter && ready && (
          <RecipeTimeline
            open={ready}
            showRecipeCards
            queryFilter={queryFilter}
          />
        )}
      </Box>
    </div>
  );
}
