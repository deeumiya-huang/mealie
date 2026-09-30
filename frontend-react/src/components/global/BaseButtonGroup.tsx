import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { useTheme } from "@mui/material/styles";
import { cssColor } from "~/theme/theme";
import { BaseMenu } from "./BaseMenu";
import type { ButtonOption } from "./BaseMenu";
import { Icon } from "./Icon";

export interface BaseButtonGroupProps {
  buttons: ButtonOption[];
  large?: boolean;
  stretch?: boolean;
  /** Fired with the button's `event` name (the Vue component emitted dynamic events). */
  onEvent?: (event: string) => void;
}

export function BaseButtonGroup({ buttons, large = true, stretch = false, onEvent }: BaseButtonGroupProps) {
  const theme = useTheme();
  const maxButtonWidth = `${100 / buttons.length}%`;
  return (
    <Box sx={{ display: "flex", alignItems: "center", ...(stretch ? { width: "100%" } : {}) }}>
      {buttons.map(btn =>
        btn.children
          ? (
              <BaseMenu
                key={`menu-${btn.event}`}
                large={large}
                activator={btn}
                children={btn.children}
                onMenu={onEvent}
              />
            )
          : (
              <Tooltip key={`btn-${btn.event}`} title={btn.text} enterDelay={200} placement="bottom">
                <span style={stretch ? { width: maxButtonWidth } : undefined}>
                  <IconButton
                    size={large ? "large" : "medium"}
                    disabled={btn.disabled}
                    onClick={() => onEvent?.(btn.event)}
                    sx={{ borderRadius: 0, color: cssColor(theme, btn.color), ...(stretch ? { width: "100%" } : {}) }}
                  >
                    <Icon path={btn.icon} />
                  </IconButton>
                </span>
              </Tooltip>
            ),
      )}
    </Box>
  );
}

export default BaseButtonGroup;
