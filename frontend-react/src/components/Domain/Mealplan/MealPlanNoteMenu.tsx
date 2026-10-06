// Usage: <MealPlanNoteMenu onMealplanRemove={…} onMealplanEdit={…} /> — the "…" menu of a note entry (no recipe card menu).
import { useState } from "react";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { MdiIcon } from "@/components/global/MdiIcon";
import { useI18n } from "@/i18n";
import { icons } from "@/lib/icons";

interface MealPlanNoteMenuProps {
  onMealplanRemove?: () => void;
  onMealplanEdit?: () => void;
}

export function MealPlanNoteMenu({ onMealplanRemove, onMealplanEdit }: MealPlanNoteMenuProps) {
  const { t } = useI18n();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  const items = [
    {
      text: t("meal-plan.remove-from-plan"),
      icon: icons.calendarRemove,
      onClick: onMealplanRemove,
    },
    {
      text: t("meal-plan.edit-meal-plan"),
      icon: icons.calendarEdit,
      onClick: onMealplanEdit,
    },
  ];

  return (
    <>
      <IconButton
        color="secondary"
        aria-haspopup="menu"
        aria-expanded={anchor !== null}
        sx={{ ml: "auto" }}
        onClick={(event) => {
          // the card around a note is not a link, but keep the click from reaching it anyway
          event.stopPropagation();
          setAnchor(event.currentTarget);
        }}
      >
        <MdiIcon path={icons.dotsHorizontal} />
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={anchor !== null}
        onClose={() => setAnchor(null)}
        slotProps={{ list: { dense: true } }}
      >
        {items.map(item => (
          <MenuItem
            key={item.text}
            dense
            onClick={() => {
              setAnchor(null);
              item.onClick?.();
            }}
          >
            <ListItemIcon><MdiIcon path={item.icon} /></ListItemIcon>
            <ListItemText>{item.text}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
