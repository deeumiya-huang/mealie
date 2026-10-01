import { useState } from "react";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { Icon } from "~/components/global/Icon";
import { useI18n } from "~/hooks/use-global-i18n";
import { icons } from "~/lib/icons";

export function MealPlanNoteMenu({ onMealplanRemove, onMealplanEdit }: { onMealplanRemove?: () => void; onMealplanEdit?: () => void }) {
  const i18n = useI18n();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const items = [
    { text: i18n.t("meal-plan.remove-from-plan"), icon: icons.calendarRemove, action: onMealplanRemove },
    { text: i18n.t("meal-plan.edit-meal-plan"), icon: icons.calendarEdit, action: onMealplanEdit },
  ];
  return (
    <>
      <IconButton color="secondary" sx={{ ml: "auto" }} onClick={e => setAnchor(e.currentTarget)}>
        <Icon path={icons.dotsHorizontal} />
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "top", horizontal: "left" }}
        transformOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        {items.map(item => (
          <MenuItem
            key={item.text}
            dense
            onClick={() => {
              setAnchor(null);
              item.action?.();
            }}
          >
            <ListItemIcon><Icon path={item.icon} fontSize="small" /></ListItemIcon>
            <ListItemText>{item.text}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

export default MealPlanNoteMenu;
