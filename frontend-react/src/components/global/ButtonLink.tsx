import Button from "@mui/material/Button";
import { Link as RouterLink } from "react-router";
import { Icon } from "./Icon";

export function ButtonLink({ to, text, icon = "" }: { to: string; text: string; icon?: string }) {
  return (
    <div>
      <Button
        variant="outlined"
        component={RouterLink}
        to={to}
        sx={{ borderRadius: 6, my: 0.5, mx: 0.5 }}
        startIcon={icon ? <Icon path={icon} /> : undefined}
      >
        {text}
      </Button>
    </div>
  );
}

export default ButtonLink;
