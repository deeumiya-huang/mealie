// Usage: <AppToolbar>{extra actions}</AppToolbar> — transparent toolbar with a "Back" button (history -1).
import type { ReactNode } from "react";
import Toolbar from "@mui/material/Toolbar";
import { useNavigate } from "react-router";
import { useI18n } from "@/i18n";
import { icons } from "@/lib/icons";
import { BaseButton } from "./BaseButton";

interface AppToolbarProps {
  /** Accepted for parity with the Vue prop (unused there as well). */
  back?: boolean;
  children?: ReactNode;
}

export function AppToolbar({ children }: AppToolbarProps) {
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <Toolbar sx={{ bgcolor: "transparent", boxShadow: "none" }}>
      <BaseButton color="inherit" secondary icon={icons.arrowLeftBold} sx={{ borderRadius: 9999 }} onClick={() => void navigate(-1)}>
        {t("general.back")}
      </BaseButton>
      {children}
    </Toolbar>
  );
}
