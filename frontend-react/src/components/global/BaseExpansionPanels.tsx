// Usage: <BaseExpansionPanels startOpen><Accordion>…</Accordion></BaseExpansionPanels>
// Port of `v-expansion-panels`: children are MUI `Accordion`s; at most one is expanded at a time and `startOpen`
// expands the first.
import { Children, cloneElement, isValidElement, useState, type ReactElement, type ReactNode } from "react";
import Box from "@mui/material/Box";
import type { AccordionProps } from "@mui/material/Accordion";

interface BaseExpansionPanelsProps {
  startOpen?: boolean;
  children?: ReactNode;
}

export function BaseExpansionPanels({ startOpen = false, children }: BaseExpansionPanelsProps) {
  const [open, setOpen] = useState<number | null>(startOpen ? 0 : null);

  return (
    <Box sx={{ borderRadius: 1 }}>
      {Children.toArray(children).map((child, index) => {
        if (!isValidElement<AccordionProps>(child)) return child;
        return cloneElement(child as ReactElement<AccordionProps>, {
          expanded: open === index,
          onChange: (_event, expanded) => setOpen(expanded ? index : null),
        });
      })}
    </Box>
  );
}
