import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useOutletContext } from "react-router";
import { format } from "date-fns";
import { DndContext, PointerSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { Icon } from "~/components/global/Icon";
import { GroupMealPlanEntryDialog } from "~/components/Domain/Household/GroupMealPlanEntryDialog";
import { MealPlanDay } from "~/components/Domain/Mealplan/MealPlanDay";
import { MealPlanLayout } from "~/components/Domain/Mealplan/MealPlanLayout";
import { RecipeCardLineItem } from "~/components/Domain/Recipe/RecipeCardLineItem";
import { useUserApi } from "~/hooks/api";
import { getEntryTypeText, usePlanTypeOptions } from "~/hooks/use-group-mealplan";
import { useDisplay } from "~/hooks/use-display";
import { useI18n } from "~/hooks/use-global-i18n";
import { icons } from "~/lib/icons";
import type { ReadPlanEntry } from "~/lib/api/types/meal-plan";
import type { PlannerOutletContext } from "../planner";

/** One day column; meals can be dropped here from any other day (vue-draggable-plus `group="meals"`). */
function DayDropZone({ index, children }: { index: number; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `day-${index}`, data: { index } });
  return (
    <Box ref={setNodeRef} sx={{ minHeight: 150, borderRadius: 1, bgcolor: isOver ? "action.hover" : undefined }}>
      {children}
    </Box>
  );
}

interface MealCardProps {
  mealplan: ReadPlanEntry;
  onEdit: () => void;
  onRandomize: () => void;
}

function MealCard({ mealplan, onEdit, onRandomize }: MealCardProps) {
  const i18n = useI18n();
  const display = useDisplay();
  const { actions } = useOutletContext<PlannerOutletContext>();
  const planTypeOptions = usePlanTypeOptions();
  const [typeAnchor, setTypeAnchor] = useState<HTMLElement | null>(null);
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } = useDraggable({ id: mealplan.id, data: { mealplan } });
  // On larger screens the whole card is the handle, on phones only the arrow button
  const wholeCardHandle = display.smAndUp;
  const handleListeners = { ...attributes, ...listeners };

  return (
    <Card
      ref={(el: HTMLDivElement | null) => {
        setNodeRef(el);
        if (wholeCardHandle) setActivatorNodeRef(el);
      }}
      {...(wholeCardHandle ? handleListeners : {})}
      sx={{
        my: 1,
        ml: 2,
        mr: 0.5,
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : undefined,
        zIndex: isDragging ? 10 : undefined,
        position: "relative",
        touchAction: wholeCardHandle ? "none" : undefined,
      }}
    >
      {mealplan.recipe
        ? <RecipeCardLineItem recipe={mealplan.recipe} disableLink onClick={onEdit} />
        : (
            <ListItemButton sx={{ py: 1, gap: 2 }} onClick={onEdit}>
              <Avatar sx={{ bgcolor: "transparent", color: "text.primary" }}><Icon path={icons.primary} /></Avatar>
              <ListItemText primary={mealplan.title} secondary={mealplan.text || undefined} />
            </ListItemButton>
          )}
      <Divider sx={{ mx: 1 }} />
      <Box sx={{ py: 1, px: 1, display: "flex", alignItems: "center" }}>
        <IconButton
          size="small"
          ref={wholeCardHandle ? undefined : setActivatorNodeRef}
          {...(!wholeCardHandle ? handleListeners : {})}
          sx={{ touchAction: "none" }}
        >
          <Icon path={icons.arrowUpDown} />
        </IconButton>
        <Chip
          size="small"
          color="accent"
          sx={{ borderRadius: 1 }}
          icon={<Icon path={icons.tags} size="small" />}
          label={getEntryTypeText(mealplan.entryType!)}
          onPointerDown={e => e.stopPropagation()}
          onClick={(e) => {
            e.preventDefault();
            setTypeAnchor(e.currentTarget);
          }}
        />
        <Menu anchorEl={typeAnchor} open={!!typeAnchor} onClose={() => setTypeAnchor(null)}>
          {planTypeOptions.map(mealType => (
            <MenuItem
              key={mealType.value}
              onClick={() => {
                setTypeAnchor(null);
                void actions.setType(mealplan, mealType.value);
              }}
            >
              {mealType.text}
            </MenuItem>
          ))}
        </Menu>
        {mealplan.recipe && mealplan.entryType && (
          <IconButton
            size="small"
            sx={{ ml: "auto" }}
            title={i18n.t("meal-plan.randomize-recipe")}
            onPointerDown={e => e.stopPropagation()}
            onClick={onRandomize}
          >
            <Icon path={icons.diceMultiple} />
          </IconButton>
        )}
        <IconButton
          size="small"
          sx={!mealplan.recipe || !mealplan.entryType ? { ml: "auto" } : undefined}
          onPointerDown={e => e.stopPropagation()}
          onClick={() => void actions.deleteOne(mealplan.id)}
        >
          <Icon path={icons.delete} />
        </IconButton>
      </Box>
    </Card>
  );
}

export default function MealPlanPlannerEditPage() {
  const { mealplans, actions } = useOutletContext<PlannerOutletContext>();
  const api = useUserApi();

  // Local copy so a dropped meal moves immediately, before the refresh comes back
  const [mealplansByDate, setMealplansByDate] = useState<Record<string, ReadPlanEntry[]>>({});
  useEffect(() => {
    setMealplansByDate(Object.fromEntries(mealplans.map(plan => [plan.date.toString(), plan.meals ? [...plan.meals] : []])));
  }, [mealplans]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );

  function onDragEnd(event: DragEndEvent) {
    // A Meal was moved, set the new date value and make an update request and refresh the meals
    const mealData = event.active.data.current?.mealplan as ReadPlanEntry | undefined;
    const toIndex = event.over?.data.current?.index as number | undefined;
    if (!mealData || toIndex === undefined) return;

    const destDate = mealplans[toIndex]!.date;
    const moved = { ...mealData, date: format(destDate, "yyyy-MM-dd") };
    setMealplansByDate((prev) => {
      const next: Record<string, ReadPlanEntry[]> = {};
      for (const [key, meals] of Object.entries(prev)) {
        next[key] = meals.filter(m => m.id !== mealData.id);
      }
      next[destDate.toString()] = [...(next[destDate.toString()] ?? []), moved];
      return next;
    });
    void actions.updateOne(moved);
  }

  // =====================================================
  // Meal Entry Dialog

  const [dialog, setDialog] = useState<{ open: boolean; entry: ReadPlanEntry | null; date: Date | null }>({ open: false, entry: null, date: null });

  function editMeal(mealplan: ReadPlanEntry) {
    if (!mealplan.entryType) return;
    setDialog({ open: true, entry: mealplan, date: null });
  }

  async function randomizeMeal(mealplan: ReadPlanEntry) {
    if (!mealplan.entryType) {
      return;
    }
    // Create the new random entry first, so a failure here doesn't lose the current entry
    const { data: created } = await api.mealplans.setRandom({ date: mealplan.date, entryType: mealplan.entryType });
    if (created) {
      await api.mealplans.deleteOne(mealplan.id);
      void actions.refreshAll();
    }
  }

  return (
    <div>
      <GroupMealPlanEntryDialog
        open={dialog.open}
        onOpenChange={open => setDialog(prev => ({ ...prev, open }))}
        entry={dialog.entry}
        date={dialog.date}
        onCreate={payload => void actions.createOne(payload)}
        onUpdate={payload => void actions.updateOne(payload)}
      />
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <MealPlanLayout mealplans={mealplans}>
          {({ plan, index, day }) => (
            <MealPlanDay day={day.date} recipes={day.recipes} actions={actions} inlineActions>
              <DayDropZone index={index}>
                {(mealplansByDate[plan.date.toString()] ?? []).map(mealplan => (
                  <MealCard
                    key={mealplan.id}
                    mealplan={mealplan}
                    onEdit={() => editMeal(mealplan)}
                    onRandomize={() => void randomizeMeal(mealplan)}
                  />
                ))}
              </DayDropZone>
            </MealPlanDay>
          )}
        </MealPlanLayout>
      </DndContext>
    </div>
  );
}
