// Usage: <ButtonLink to="/path" text={t("…")} icon={icons.edit} /> — rounded outlined link button.
import Button from "@mui/material/Button";
import { Link } from "react-router";
import { MdiIcon } from "./MdiIcon";

interface ButtonLinkProps {
  to: string;
  text: string;
  icon?: string;
}

export function ButtonLink({ to, text, icon = "" }: ButtonLinkProps) {
  return (
    <div>
      <Button
        component={Link}
        to={to}
        variant="outlined"
        color="inherit"
        startIcon={icon !== "" ? <MdiIcon path={icon} /> : undefined}
        sx={{ borderRadius: 6, my: 0.5, mx: 0.5 }}
      >
        {text}
      </Button>
    </div>
  );
}
