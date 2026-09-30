import type { ReactNode } from "react";
import Toolbar from "@mui/material/Toolbar";
import { useNavigate } from "react-router";
import { icons } from "~/lib/icons";
import { useI18n } from "~/hooks/use-global-i18n";
import { BaseButton } from "./BaseButton";
import { Icon } from "./Icon";

export function AppToolbar({ children }: { back?: boolean; children?: ReactNode }) {
  const i18n = useI18n();
  const navigate = useNavigate();
  return (
    <Toolbar disableGutters sx={{ bgcolor: "transparent", gap: 1 }}>
      <BaseButton secondary color="inherit" sx={{ borderRadius: 6 }} onClick={() => navigate(-1)} iconSlot={<Icon path={icons.arrowLeftBold} />}>
        {i18n.t("general.back")}
      </BaseButton>
      {children}
    </Toolbar>
  );
}

export default AppToolbar;
