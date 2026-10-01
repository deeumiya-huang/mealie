import { useState } from "react";
import { useOutletContext } from "react-router";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import { GroupMealPlanEntryDialog } from "~/components/Domain/Household/GroupMealPlanEntryDialog";
import { MealPlanDay } from "~/components/Domain/Mealplan/MealPlanDay";
import { MealPlanLayout } from "~/components/Domain/Mealplan/MealPlanLayout";
import { MealPlanNoteMenu } from "~/components/Domain/Mealplan/MealPlanNoteMenu";
import { RecipeCardMobile } from "~/components/Domain/Recipe/RecipeCardMobile";
import { useI18n } from "~/hooks/use-global-i18n";
import { icons } from "~/lib/icons";
import type { ReadPlanEntry } from "~/lib/api/types/meal-plan";
import type { PlannerOutletContext } from "../planner";

export default function MealPlanPlannerViewPage() {
  const i18n = useI18n();
  const { mealplans, actions } = useOutletContext<PlannerOutletContext>();
  const [dialog, setDialog] = useState<{ open: boolean; entry: ReadPlanEntry | null; date: Date | null }>({ open: false, entry: null, date: null });

  function editMeal(mealplan: ReadPlanEntry) {
    if (!mealplan.entryType) return;
    setDialog({ open: true, entry: mealplan, date: null });
  }

  return (
    <Box sx={{ mx: 0, p: 0 }}>
      <GroupMealPlanEntryDialog
        open={dialog.open}
        onOpenChange={open => setDialog(prev => ({ ...prev, open }))}
        entry={dialog.entry}
        date={dialog.date}
        onCreate={payload => void actions.createOne(payload)}
        onUpdate={payload => void actions.updateOne(payload)}
      />
      <MealPlanLayout mealplans={mealplans}>
        {({ day }) => (
          <MealPlanDay day={day.date} actions={actions} recipes={day.recipes}>
            {day.sections.length > 0 && (
              <Card variant="outlined" sx={{ pl: 2, pr: 1, border: "none" }}>
                {day.sections.map(section => (
                  <div key={section.title}>
                    <Box sx={{ py: 1, display: "flex", flexDirection: "column" }}>
                      <Typography variant="overline" sx={{ my: 0 }}>{section.title}</Typography>
                    </Box>
                    {section.meals.map(mealplan => (
                      <RecipeCardMobile
                        key={mealplan.id}
                        recipeId={mealplan.recipe ? mealplan.recipe.id! : ""}
                        className="mb-2"
                        rating={mealplan.recipe ? mealplan.recipe.rating! : 0}
                        slug={mealplan.recipe ? mealplan.recipe.slug! : mealplan.title!}
                        description={mealplan.recipe ? mealplan.recipe.description! : mealplan.text!}
                        name={mealplan.recipe ? mealplan.recipe.name! : mealplan.title!}
                        image={mealplan.recipe ? mealplan.recipe.image : undefined}
                        tags={mealplan.recipe ? mealplan.recipe.tags! : []}
                        contextMenuLeadingItems={[
                          { title: i18n.t("meal-plan.remove-from-plan"), icon: icons.calendarRemove, event: "mealplanRemove", isPublic: false },
                          { title: i18n.t("meal-plan.edit-meal-plan"), icon: icons.calendarEdit, event: "mealplanEdit", isPublic: false },
                        ]}
                        onMealplanRemove={() => void actions.deleteOne(mealplan.id)}
                        onMealplanEdit={() => editMeal(mealplan)}
                        contextMenu={!mealplan.recipe
                          ? <MealPlanNoteMenu onMealplanRemove={() => void actions.deleteOne(mealplan.id)} onMealplanEdit={() => editMeal(mealplan)} />
                          : undefined}
                      />
                    ))}
                  </div>
                ))}
              </Card>
            )}
          </MealPlanDay>
        )}
      </MealPlanLayout>
    </Box>
  );
}
