import { useMemo } from "react";
import Container from "@mui/material/Container";
import { RecipeOrganizerPage } from "@/components/Domain/Recipe/RecipeOrganizerPage";
import { useToolStore } from "@/hooks/store";
import { useMealieAuth } from "@/hooks/use-mealie-auth";
import { usePageTitle } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import type { RecipeTool } from "@/lib/api/types/recipe";
import { icons } from "@/lib/icons";

interface RecipeToolWithOnHand extends RecipeTool {
  onHand: boolean;
}

export default function RecipeToolsPage() {
  const auth = useMealieAuth();
  const toolStore = useToolStore();
  const { t } = useI18n();

  usePageTitle(t("tool.tools"));

  const userHousehold = auth.user?.householdSlug || "";
  const tools = useMemo(() => toolStore.store.map(tool => (
    {
      ...tool,
      onHand: tool.householdsWithTool?.includes(userHousehold) || false,
    } as RecipeToolWithOnHand
  )), [toolStore.store, userHousehold]);

  async function deleteOne(id: string | number) {
    await toolStore.actions.deleteOne(id);
  }

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
    <Container>
      <RecipeOrganizerPage
        icon={icons.potSteam}
        items={tools}
        itemType="tools"
        title={t("tool.tools")}
        onDelete={id => void deleteOne(id)}
        onUpdate={tool => void updateOne(tool)}
      />
    </Container>
  );
}
