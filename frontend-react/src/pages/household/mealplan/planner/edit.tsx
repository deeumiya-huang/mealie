import { useState } from "react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import { format } from "date-fns";
import { useOutletContext } from "react-router";
import { MdiIcon } from "@/components/global/MdiIcon";
import { SpinTransition } from "@/components/global/Transition/SpinTransition";
import { GroupMealPlanEntryDialog } from "@/components/Domain/Household/GroupMealPlanEntryDialog";
import { MealPlanDay } from "@/components/Domain/Mealplan/MealPlanDay";
import { MealPlanDropList, type MealDropEvent } from "@/components/Domain/Mealplan/MealPlanDropList";
import { MealPlanLayout } from "@/components/Domain/Mealplan/MealPlanLayout";
import { RecipeCardLineItem } from "@/components/Domain/Recipe/RecipeCardLineItem";
import { useUserApi } from "@/hooks/api";
import { getEntryTypeText, usePlanTypeOptions } from "@/hooks/use-group-mealplan";
import { useDisplay } from "@/hooks/utils";
import { moveItem } from "@/hooks/utils/use-sortable";
import { useI18n } from "@/i18n";
import type { PlanEntryType, ReadPlanEntry } from "@/lib/api/types/meal-plan";
import { icons } from "@/lib/icons";
import type { PlannerOutletContext } from "../planner";

type MealsByDateKey = Record<string, ReadPlanEntry[]>;

export default function HouseholdMealplanPlannerEditPage() {
  const { t } = useI18n();
  const { mealplans, actions } = useOutletContext<PlannerOutletContext>();
  const api = useUserApi();
  const planTypeOptions = usePlanTypeOptions();
  const { smAndUp } = useDisplay();

  // Local mutable meals object (re-created from the props whenever they change)
  function buildLocal(): MealsByDateKey {
    const local: MealsByDateKey = {};
    for (const plan of mealplans) {
      local[plan.date.toString()] = plan.meals ? [...plan.meals] : [];
    }
    return local;
  }

  const [mealplansByDate, setMealplansByDate] = useState<MealsByDateKey>(buildLocal);
  const [previousMealplans, setPreviousMealplans] = useState(mealplans);
  if (previousMealplans !== mealplans) {
    setPreviousMealplans(mealplans);
    setMealplansByDate(buildLocal());
  }

  function onMoveCallback({ fromIndex, toIndex, oldIndex, newIndex }: MealDropEvent) {
    // A Meal was moved, set the new date value and make an update request and refresh the meals
    const fromPlan = mealplans[fromIndex];
    const toPlan = mealplans[toIndex];
    if (!fromPlan || !toPlan) {
      return;
    }

    const fromKey = fromPlan.date.toString();
    const destDate = toPlan.date;
    const destKey = destDate.toString();

    const source = mealplansByDate[fromKey] ?? [];
    const moved = source[oldIndex];
    if (!moved) {
      return;
    }

    const mealData: ReadPlanEntry = { ...moved, date: format(destDate, "yyyy-MM-dd") };

    if (fromKey === destKey) {
      setMealplansByDate(current => ({
        ...current,
        [destKey]: moveItem(current[destKey] ?? [], oldIndex, newIndex).map(meal => (meal.id === mealData.id ? mealData : meal)),
      }));
    }
    else {
      setMealplansByDate((current) => {
        const dest = [...(current[destKey] ?? [])];
        dest.splice(newIndex, 0, mealData);
        return {
          ...current,
          [fromKey]: (current[fromKey] ?? []).filter((_, i) => i !== oldIndex),
          [destKey]: dest,
        };
      });
    }

    void actions.updateOne(mealData);
  }

  // =====================================================
  // Meal Entry Dialog

  const [dialog, setDialog] = useState<{ open: boolean; entry: ReadPlanEntry | null; date: Date | null }>({
    open: false,
    entry: null,
    date: null,
  });

  function editMeal(mealplan: ReadPlanEntry) {
    if (!mealplan.entryType) return;

    setDialog({ open: true, entry: mealplan, date: null });
  }

  async function randomizeMeal(mealplan: ReadPlanEntry) {
    if (!mealplan.entryType) {
      return;
    }

    // Create the new random entry first, so a failure here doesn't lose the current entry
    const { data: created } = await api.mealplans.setRandom({
      date: mealplan.date,
      entryType: mealplan.entryType,
    });

    if (created) {
      await api.mealplans.deleteOne(mealplan.id);
      void actions.refreshAll();
    }
  }

  // the entry type menu: one menu for the whole page, opened from the chip of one meal
  const [typeMenu, setTypeMenu] = useState<{ anchor: HTMLElement; mealplan: ReadPlanEntry } | null>(null);

  function setType(mealplan: ReadPlanEntry, type: PlanEntryType) {
    setTypeMenu(null);
    void actions.setType({ ...mealplan }, type);
  }

  return (
    <div>
      <GroupMealPlanEntryDialog
        open={dialog.open}
        onOpenChange={open => setDialog(current => ({ ...current, open }))}
        entry={dialog.entry}
        date={dialog.date}
        onCreate={payload => void actions.createOne(payload)}
        onUpdate={payload => void actions.updateOne(payload)}
      />
      <Menu
        anchorEl={typeMenu?.anchor ?? null}
        open={typeMenu !== null}
        onClose={() => setTypeMenu(null)}
      >
        {planTypeOptions.map(mealType => (
          <MenuItem key={mealType.value} onClick={() => typeMenu && setType(typeMenu.mealplan, mealType.value)}>
            {mealType.text}
          </MenuItem>
        ))}
      </Menu>
      <MealPlanLayout mealplans={mealplans}>
        {({ plan, index, day }) => (
          <MealPlanDay day={day.date} recipes={day.recipes} actions={actions} inlineActions>
            <MealPlanDropList index={index} onDrop={onMoveCallback}>
              <SpinTransition>
                {(mealplansByDate[plan.date.toString()] ?? []).map(mealplan => (
                  <Card
                    key={mealplan.id}
                    className={smAndUp ? "handle" : undefined}
                    sx={{ my: 1, ml: 2, mr: 0.5, ...(smAndUp ? { cursor: "grab" } : {}) }}
                  >
                    {mealplan.recipe
                      ? (
                          <Box sx={{ py: 1, cursor: "pointer" }} onClick={() => editMeal(mealplan)}>
                            <RecipeCardLineItem recipe={mealplan.recipe} disableLink />
                          </Box>
                        )
                      : (
                          <ListItemButton sx={{ py: 1 }} onClick={() => editMeal(mealplan)}>
                            <ListItemAvatar>
                              <Avatar>
                                <MdiIcon path={icons.primary} />
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText primary={mealplan.title} secondary={mealplan.text || undefined} />
                          </ListItemButton>
                        )}
                    <Divider sx={{ mx: 1 }} />
                    <Box sx={{ py: 1, px: 1, display: "flex", alignItems: "center" }}>
                      <IconButton size="small" className={!smAndUp ? "handle" : undefined}>
                        <MdiIcon path={icons.arrowUpDown} />
                      </IconButton>
                      <Chip
                        size="small"
                        color="accent"
                        icon={<MdiIcon path={icons.tags} />}
                        label={getEntryTypeText(mealplan.entryType as PlanEntryType)}
                        sx={{ borderRadius: 1 }}
                        onClick={event => setTypeMenu({ anchor: event.currentTarget, mealplan })}
                      />
                      {mealplan.recipe && mealplan.entryType && (
                        <Tooltip title={t("meal-plan.randomize-recipe")}>
                          <IconButton size="small" sx={{ ml: "auto" }} onClick={() => void randomizeMeal(mealplan)}>
                            <MdiIcon path={icons.diceMultiple} />
                          </IconButton>
                        </Tooltip>
                      )}
                      <IconButton
                        size="small"
                        sx={!mealplan.recipe || !mealplan.entryType ? { ml: "auto" } : undefined}
                        onClick={() => void actions.deleteOne(mealplan.id)}
                      >
                        <MdiIcon path={icons.delete} />
                      </IconButton>
                    </Box>
                  </Card>
                ))}
              </SpinTransition>
            </MealPlanDropList>
          </MealPlanDay>
        )}
      </MealPlanLayout>
    </div>
  );
}
