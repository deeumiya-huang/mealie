// Usage: <HelpIcon small right>help text</HelpIcon> — help icon button; the card with `children` opens on hover or click.
import { useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import IconButton from "@mui/material/IconButton";
import Popper from "@mui/material/Popper";
import { icons } from "@/lib/icons";
import { MdiIcon } from "./MdiIcon";

interface HelpIconProps {
  small?: boolean;
  right?: boolean;
  children?: ReactNode;
}

export function HelpIcon({ small = false, right = false, children }: HelpIconProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const open = anchor !== null;

  return (
    <Box sx={{ textAlign: "center" }} onMouseLeave={() => setAnchor(null)}>
      <IconButton
        size={small ? "small" : "medium"}
        aria-haspopup="true"
        aria-expanded={open}
        onMouseEnter={event => setAnchor(event.currentTarget)}
        onClick={(event) => {
          event.stopPropagation();
          setAnchor(open ? null : event.currentTarget);
        }}
      >
        <MdiIcon path={icons.help} size={small ? "small" : "default"} />
      </IconButton>
      <Popper open={open} anchorEl={anchor} placement={right ? "top-start" : "top-end"} sx={{ zIndex: theme => theme.zIndex.tooltip }}>
        <Card sx={{ maxWidth: 300, textAlign: "start" }} elevation={8}>
          <CardContent>{children}</CardContent>
        </Card>
      </Popper>
    </Box>
  );
}
