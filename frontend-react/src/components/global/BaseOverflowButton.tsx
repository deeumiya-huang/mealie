// Usage: <BaseOverflowButton mode="model" items={items} value={selected} onChange={setSelected} />
//        <BaseOverflowButton mode="link" items={[{ text, to }]} /> · <BaseOverflowButton mode="event" items={…} onAction={event => …} />
// A dropdown button: "model" shows/sets the selected item's value, "link" navigates, "event" calls `onAction(item.event)`.
// Extra props (e.g. `size`, `variant`) go to the button, like Vue's `$attrs`.
import { useState, type MouseEvent } from "react";
import Button, { type ButtonProps } from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { Link } from "react-router";
import { useI18n } from "@/i18n";
import { icons } from "@/lib/icons";
import { MdiIcon } from "./MdiIcon";

type OverflowMode = "model" | "link" | "event";

export interface MenuItemSpec {
  text: string;
  icon?: string;
  to?: string;
  value?: string;
  event?: string;
  divider?: boolean;
  hide?: boolean;
}

export interface BaseOverflowButtonProps extends Omit<ButtonProps, "onChange" | "value" | "children" | "color" | "disabled"> {
  mode?: OverflowMode;
  items: MenuItemSpec[];
  disabled?: boolean;
  btnClass?: string;
  btnText?: string;
  value?: string;
  onChange?: (value: string) => void;
  onAction?: (event: string) => void;
}

export function BaseOverflowButton({
  mode = "model",
  items,
  disabled = false,
  btnClass = "",
  btnText,
  value = "",
  onChange,
  onAction,
  className,
  ...buttonProps
}: BaseOverflowButtonProps) {
  const { t } = useI18n();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = () => setAnchor(null);

  const resolvedBtnText = btnText ?? t("general.actions");
  const activeObj: MenuItemSpec = items.find(item => item.value === value) ?? { text: "DEFAULT", value: "" };

  function onSelect(item: MenuItemSpec) {
    close();
    if (mode === "model") {
      onChange?.(item.value || "");
    }
    else if (mode === "event" && item.event) {
      onAction?.(item.event);
    }
  }

  return (
    <>
      <Button
        color="primary"
        variant="contained"
        {...buttonProps}
        className={[btnClass, className].filter(Boolean).join(" ")}
        disabled={disabled}
        startIcon={activeObj.icon ? <MdiIcon path={activeObj.icon} /> : undefined}
        endIcon={<MdiIcon path={icons.chevronDown} />}
        onClick={(event: MouseEvent<HTMLButtonElement>) => setAnchor(event.currentTarget)}
      >
        {mode === "model" ? activeObj.text : resolvedBtnText}
      </Button>
      <Menu anchorEl={anchor} open={anchor !== null} onClose={close} slotProps={{ list: { dense: true } }}>
        {items.filter(item => !item.hide).flatMap((item, index) => {
          const content = (
            <>
              {item.icon ? <ListItemIcon><MdiIcon path={item.icon} /></ListItemIcon> : null}
              <ListItemText>{item.text}</ListItemText>
            </>
          );
          const entry = mode === "link" && item.to
            ? <MenuItem key={index} dense component={Link} to={item.to} onClick={close}>{content}</MenuItem>
            : <MenuItem key={index} dense selected={mode === "model" && item.value === value} onClick={() => onSelect(item)}>{content}</MenuItem>;
          return item.divider ? [entry, <Divider key={`divider-${index}`} sx={{ my: 0.5 }} />] : [entry];
        })}
      </Menu>
    </>
  );
}
