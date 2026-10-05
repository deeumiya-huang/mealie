// Usage: <BaseButtonGroup buttons={[{ icon: icons.edit, text: t("general.edit"), event: "edit" }]}
//          onAction={event => event === "edit" ? … : …} />
// Icon-only buttons with a tooltip (the tooltip text is the accessible name); an option with `children`
// becomes a BaseMenu. Vue emitted each option's `event` by name; here every click calls `onAction(event)`.
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { BaseMenu, type ButtonOption } from "./BaseMenu";
import { isPaletteColor } from "./colors";
import { MdiIcon } from "./MdiIcon";

interface BaseButtonGroupProps {
  buttons: ButtonOption[];
  large?: boolean;
  stretch?: boolean;
  onAction?: (event: string) => void;
}

export function BaseButtonGroup({ buttons, large = true, stretch = false, onAction }: BaseButtonGroupProps) {
  const width = `${100 / buttons.length}%`;

  return (
    <Box sx={{ display: "inline-flex", flexWrap: "nowrap" }}>
      {buttons.map(btn => btn.children
        ? (
            <BaseMenu
              key={`menu-${btn.event}`}
              large={large}
              activator={btn}
              onMenu={event => onAction?.(event)}
            >
              {btn.children}
            </BaseMenu>
          )
        : (
            <Tooltip key={`btn-${btn.event}`} title={btn.text} placement="bottom" enterDelay={200}>
              {/* span keeps the tooltip working on disabled buttons */}
              <span style={stretch ? { width } : undefined}>
                <IconButton
                  aria-label={btn.text}
                  color={isPaletteColor(btn.color) ? btn.color : "default"}
                  size={large ? "large" : "medium"}
                  disabled={btn.disabled}
                  sx={{ borderRadius: 0, ...(stretch ? { width: "100%" } : {}) }}
                  onClick={() => onAction?.(btn.event)}
                >
                  <MdiIcon path={btn.icon} />
                </IconButton>
              </span>
            </Tooltip>
          ))}
    </Box>
  );
}
