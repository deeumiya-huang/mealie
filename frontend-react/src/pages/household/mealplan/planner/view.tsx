import { useState } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import { useOutletContext } from "react-router";
import { SpinTransition } from "@/components/global/Transition/SpinTransition";
import { GroupMealPlanEntryDialog } from "@/components/Domain/Household/GroupMealPlanEntryDialog";
import { MealPlanDay } from "@/components/Domain/Mealplan/MealPlanDay";
import { MealPlanLayout } from "@/components/Domain/Mealplan/MealPlanLayout";
import { MealPlanNoteMenu } from "@/components/Domain/Mealplan/MealPlanNoteMenu";
import { RecipeCardMobile } from "@/components/Domain/Recipe/RecipeCardMobile";
import { useI18n } from "@/i18n";
import type { ReadPlanEntry } from "@/lib/api/types/meal-plan";
import { icons } from "@/lib/icons";
import type { PlannerOutletContext } from "../planner";

export default function HouseholdMealplanPlannerViewPage() {
  const { t } = useI18n();
  const { mealplans, actions } = useOutletContext<PlannerOutletContext>();

  const [dialog, setDialog] = useState<{ open: boolean; entry: ReadPlanEntry | null; date: Date | null }>({
    open: false,
    entry: null,
    date: null,
  });

  function editMeal(mealplan: ReadPlanEntry) {
    if (!mealplan.entryType) return;

    setDialog({ open: true, entry: mealplan, date: null });
  }

  return (
    <Container disableGutters sx={{ mx: 0, p: 0 }}>
      <GroupMealPlanEntryDialog
        open={dialog.open}
        onOpenChange={open => setDialog(current => ({ ...current, open }))}
        entry={dialog.entry}
        date={dialog.date}
        onCreate={payload => void actions.createOne(payload)}
        onUpdate={payload => void actions.updateOne(payload)}
      />
      <MealPlanLayout mealplans={mealplans}>
        {({ day }) => (
          <MealPlanDay day={day.date} actions={actions} recipes={day.recipes}>
            <SpinTransition>
              {day.sections.length > 0 && (
                <Card key="sections" elevation={0} sx={{ pl: 2, pr: 1 }}>
                  <SpinTransition>
                    {day.sections.map(section => (
                      <div key={section.title}>
                        <Box sx={{ py: 1, display: "flex", flexDirection: "column" }}>
                          <Typography component="p" variant="overline" sx={{ my: 0 }}>
                            {section.title}
                          </Typography>
                        </Box>
                        <SpinTransition>
                          {section.meals.map(mealplan => (
                            <Box key={mealplan.id} sx={{ mb: 1 }}>
                              <RecipeCardMobile
                                recipeId={mealplan.recipe ? mealplan.recipe.id ?? "" : ""}
                                rating={mealplan.recipe ? mealplan.recipe.rating ?? 0 : 0}
                                slug={mealplan.recipe ? mealplan.recipe.slug ?? "" : mealplan.title ?? ""}
                                description={mealplan.recipe ? mealplan.recipe.description ?? "" : mealplan.text ?? ""}
                                name={mealplan.recipe ? mealplan.recipe.name ?? "" : mealplan.title ?? ""}
                                image={mealplan.recipe ? mealplan.recipe.image : undefined}
                                tags={mealplan.recipe ? mealplan.recipe.tags ?? [] : []}
                                contextMenuLeadingItems={[
                                  {
                                    title: t("meal-plan.remove-from-plan"),
                                    icon: icons.calendarRemove,
                                    color: undefined,
                                    event: "mealplanRemove",
                                    isPublic: false,
                                  },
                                  {
                                    title: t("meal-plan.edit-meal-plan"),
                                    icon: icons.calendarEdit,
                                    color: undefined,
                                    event: "mealplanEdit",
                                    isPublic: false,
                                  },
                                ]}
                                onMealplanRemove={() => void actions.deleteOne(mealplan.id)}
                                onMealplanEdit={() => editMeal(mealplan)}
                                contextMenu={!mealplan.recipe
                                  ? (
                                      <MealPlanNoteMenu
                                        onMealplanRemove={() => void actions.deleteOne(mealplan.id)}
                                        onMealplanEdit={() => editMeal(mealplan)}
                                      />
                                    )
                                  : undefined}
                              />
                            </Box>
                          ))}
                        </SpinTransition>
                      </div>
                    ))}
                  </SpinTransition>
                </Card>
              )}
            </SpinTransition>
          </MealPlanDay>
        )}
      </MealPlanLayout>
    </Container>
  );
}
