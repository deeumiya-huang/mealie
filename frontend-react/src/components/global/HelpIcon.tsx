import { useState } from "react";
import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import IconButton from "@mui/material/IconButton";
import Popover from "@mui/material/Popover";
import { icons } from "~/lib/icons";
import { Icon } from "./Icon";

export function HelpIcon({ small = false, right = false, children }: { small?: boolean; right?: boolean; children?: ReactNode }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return (
    <Box sx={{ textAlign: "center" }}>
      <IconButton
        size={small ? "small" : "medium"}
        onClick={(e) => {
          e.stopPropagation();
          setAnchor(e.currentTarget);
        }}
        onMouseEnter={e => setAnchor(e.currentTarget)}
      >
        <Icon path={icons.help} size={small ? "small" : undefined} />
      </IconButton>
      <Popover
        open={!!anchor}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "top", horizontal: right ? "right" : "left" }}
        transformOrigin={{ vertical: "bottom", horizontal: right ? "left" : "right" }}
        slotProps={{ paper: { onMouseLeave: () => setAnchor(null) } }}
      >
        <Card sx={{ maxWidth: 300 }}>
          <CardContent>{children}</CardContent>
        </Card>
      </Popover>
    </Box>
  );
}

export default HelpIcon;
