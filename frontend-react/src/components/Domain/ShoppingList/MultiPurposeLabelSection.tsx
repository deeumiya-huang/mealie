import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import { Icon } from "~/components/global/Icon";
import type { SortableHandleProps } from "~/components/global/SortableList";
import type { ShoppingListMultiPurposeLabelOut } from "~/lib/api/types/household";
import { icons } from "~/lib/icons";

export interface MultiPurposeLabelSectionProps {
  value: ShoppingListMultiPurposeLabelOut;
  useColor?: boolean;
  /** Drag handle from the surrounding SortableList. */
  handle?: SortableHandleProps;
}

/** One row of the "reorder labels" list: the label name and a drag handle. */
export function MultiPurposeLabelSection({ value, useColor = false, handle }: MultiPurposeLabelSectionProps) {
  const labelColor = useColor ? value.label.color : undefined;
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mx: 1 }}>
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <Icon path={icons.tags} color={labelColor} sx={{ mr: 1 }} />
        {value.label.name}
      </Box>
      <Box sx={{ minWidth: 72, ml: "auto", textAlign: "right" }}>
        <IconButton
          size="small"
          sx={{ ml: 1, cursor: "grab", touchAction: "none" }}
          ref={handle?.ref}
          {...handle?.attributes}
          {...handle?.listeners}
        >
          <Icon path={icons.arrowUpDown} />
        </IconButton>
      </Box>
    </Box>
  );
}

export default MultiPurposeLabelSection;
