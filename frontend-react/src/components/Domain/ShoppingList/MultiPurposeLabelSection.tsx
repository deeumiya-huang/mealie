// Usage: <MultiPurposeLabelSection labelSetting={setting} useColor /> — one row of the "reorder labels" dialog: the
// label name (coloured icon when `useColor`) and a drag handle (the `handle` class that the list's sortable uses).
// The Vue `v-model` is only read here, so it is the plain `labelSetting` prop.
import { useState } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import { MdiIcon } from "@/components/global/MdiIcon";
import type { ShoppingListMultiPurposeLabelOut } from "@/lib/api/types/household";
import { icons } from "@/lib/icons";

interface MultiPurposeLabelSectionProps {
  labelSetting: ShoppingListMultiPurposeLabelOut;
  useColor?: boolean;
}

export function MultiPurposeLabelSection({ labelSetting, useColor = false }: MultiPurposeLabelSectionProps) {
  // read once, like the Vue `ref` initialised from the props
  const [labelColor] = useState<string | undefined>(useColor ? labelSetting.label.color : undefined);

  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mx: 1 }}>
      <Box className="handle" sx={{ cursor: "grab" }}>
        <Box component="span" sx={{ mr: 1 }}>
          <MdiIcon path={icons.tags} sx={labelColor ? { color: labelColor } : undefined} />
        </Box>
        {labelSetting.label.name}
      </Box>
      <Box sx={{ minWidth: 72, ml: "auto", textAlign: "right" }}>
        <IconButton size="small" className="handle" sx={{ ml: 1, cursor: "grab" }}>
          <MdiIcon path={icons.arrowUpDown} />
        </IconButton>
      </Box>
    </Box>
  );
}
