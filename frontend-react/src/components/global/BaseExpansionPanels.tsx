import { Children, cloneElement, isValidElement, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import Box from "@mui/material/Box";
import type { AccordionProps } from "@mui/material/Accordion";

/**
 * v-expansion-panels equivalent: wraps MUI Accordions so only one is open at a time.
 * Children must be `<Accordion>` elements.
 */
export function BaseExpansionPanels({ startOpen = false, children }: { startOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState<number | null>(startOpen ? 0 : null);
  let index = -1;
  return (
    <Box sx={{ "& .MuiAccordion-root": { borderRadius: 1 } }}>
      {Children.map(children, (child) => {
        if (!isValidElement(child)) return child;
        index++;
        const i = index;
        return cloneElement(child as ReactElement<AccordionProps>, {
          expanded: open === i,
          onChange: (_e, expanded) => setOpen(expanded ? i : null),
        });
      })}
    </Box>
  );
}

export default BaseExpansionPanels;
