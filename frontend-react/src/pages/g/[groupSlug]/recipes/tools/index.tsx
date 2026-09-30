import { useMemo } from "react";
import { BaseContainer } from "~/components/global/BaseContainer";
import { RecipeOrganizerPage } from "~/components/Domain/Recipe/RecipeOrganizerPage";
import { useToolStore } from "~/hooks/store";
import { useI18n } from "~/hooks/use-global-i18n";
import { useMealieAuth } from "~/hooks/use-mealie-auth";
import { useSeoMeta } from "~/hooks/use-seo-meta";
import { icons } from "~/lib/icons";
import type { RecipeTool } from "~/lib/api/types/recipe";

interface RecipeToolWithOnHand extends RecipeTool {
  id: string;
  onHand: boolean;
}

export default function ToolsPage() {
  const i18n = useI18n();
  const auth = useMealieAuth();
  const toolStore = useToolStore();

  useSeoMeta({ title: i18n.t("tool.tools") });

  const userHousehold = auth.user?.householdSlug || "";
  const tools = useMemo(() => toolStore.store.map(tool => ({
    ...tool,
    onHand: tool.householdsWithTool?.includes(userHousehold) || false,
  }) as RecipeToolWithOnHand), [toolStore.store, userHousehold]);

  async function updateOne(tool: RecipeToolWithOnHand) {
    if (userHousehold) {
      if (tool.onHand && !tool.householdsWithTool?.includes(userHousehold)) {
        tool.householdsWithTool = [...(tool.householdsWithTool ?? []), userHousehold];
      }
      else if (!tool.onHand && tool.householdsWithTool?.includes(userHousehold)) {
        tool.householdsWithTool = tool.householdsWithTool.filter(household => household !== userHousehold);
      }
    }
    await toolStore.actions.updateOne(tool);
  }

  return (
    <BaseContainer>
      <RecipeOrganizerPage
        icon={icons.potSteam}
        items={tools}
        itemType="tools"
        title={i18n.t("tool.tools")}
        onDelete={id => void toolStore.actions.deleteOne(id)}
        onUpdate={tool => void updateOne(tool)}
      />
    </BaseContainer>
  );
}
