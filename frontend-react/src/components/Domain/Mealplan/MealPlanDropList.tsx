// Usage: <MealPlanDropList index={index} onDrop={event => …} handle=".handle">{cards}</MealPlanDropList>
// A day's list of meal cards that can be reordered and dragged to the other days' lists (Sortable `group: "meals"`, like
// the Vue planner's VueDraggable). `hooks/utils/use-sortable` does not support dragging between lists, so this uses
// SortableJS directly. Sortable moves DOM nodes itself, which would fight React's reconciliation: when a drop ends, the
// node is put back where it was and the caller is told where it was dropped; React renders the new order from state.
// Every list carries `data-index` (the day's index), which identifies the source and the destination list.
import { useEffect, useRef, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Sortable from "sortablejs";

export interface MealDropEvent {
  /** Index of the day the meal came from. */
  fromIndex: number;
  /** Index of the day the meal was dropped on. */
  toIndex: number;
  /** Position of the meal in its source list before the drag. */
  oldIndex: number;
  /** Position of the meal in the destination list after the drop. */
  newIndex: number;
}

interface MealPlanDropListProps {
  index: number;
  /** CSS selector of the element that starts a drag. */
  handle?: string;
  /** Called after every drop (also within the same list). The DOM has already been restored. */
  onDrop?: (event: MealDropEvent) => void;
  children?: ReactNode;
}

export function MealPlanDropList({ index, handle = ".handle", onDrop, children }: MealPlanDropListProps) {
  const container = useRef<HTMLDivElement>(null);
  const latest = useRef(onDrop);
  useEffect(() => {
    latest.current = onDrop;
  });

  useEffect(() => {
    const element = container.current;
    if (!element) {
      return;
    }

    // where the dragged node sat before Sortable moved it
    let origin: { parent: Node | null; next: Node | null } = { parent: null, next: null };

    const sortable = Sortable.create(element, {
      handle,
      delay: 250,
      delayOnTouchOnly: true,
      group: "meals",
      onStart(event) {
        origin = { parent: event.item.parentNode, next: event.item.nextSibling };
      },
      onEnd(event) {
        const fromIndex = parseInt(event.from.getAttribute("data-index") ?? "");
        const toIndex = parseInt(event.to.getAttribute("data-index") ?? "");
        const oldIndex = event.oldDraggableIndex ?? event.oldIndex;
        const newIndex = event.newDraggableIndex ?? event.newIndex;

        // undo Sortable's DOM move; React renders the new order from the caller's state
        const { item } = event;
        if (origin.parent && (item.parentNode !== origin.parent || item.nextSibling !== origin.next)) {
          origin.parent.insertBefore(item, origin.next && origin.next.parentNode === origin.parent ? origin.next : null);
        }

        if (!isNaN(fromIndex) && !isNaN(toIndex) && oldIndex !== undefined && newIndex !== undefined) {
          latest.current?.({ fromIndex, toIndex, oldIndex, newIndex });
        }
      },
    });

    return () => sortable.destroy();
  }, [handle]);

  return (
    <Box ref={container} data-index={index} sx={{ minHeight: 150 }}>
      {children}
    </Box>
  );
}
