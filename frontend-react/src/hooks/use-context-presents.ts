import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { icons } from "@/lib/icons";

// The item shape ContextMenu renders (components/global/ContextMenu re-exports this type).
export interface ContextMenuItem {
  title: string;
  icon: string;
  event: string;
  color?: string;
}

export interface ContextMenuPresets {
  delete: ContextMenuItem;
  edit: ContextMenuItem;
  save: ContextMenuItem;
}

export function useContextPresets(): ContextMenuPresets {
  const i18n = useI18n();

  return useMemo(() => ({
    delete: {
      title: i18n.t("general.delete"),
      icon: icons.delete,
      event: "delete",
    },
    edit: {
      title: i18n.t("general.edit"),
      icon: icons.edit,
      event: "edit",
    },
    save: {
      title: i18n.t("general.save"),
      icon: icons.save,
      event: "save",
    },
  }), [i18n]);
}
