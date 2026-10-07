// Usage:
//   const listRef = useRef<HTMLDivElement>(null);
//   useSortableList(listRef, items, setItems, { handle: ".handle", animation: 200, delay: 250, delayOnTouchOnly: true });
//   <div ref={listRef}>{items.map(item => <Row key={item.id} … />)}</div>
// or, when the caller needs the indices (e.g. to also reset per-row state):
//   useSortable(listRef, { handle: ".handle", onReorder: ({ oldIndex, newIndex }) => setItems(list => moveItem(list, oldIndex, newIndex)) });
//
// Drag-and-drop on SortableJS (the engine of vue-draggable-plus, which the Vue app used). Sortable moves DOM nodes
// itself, which would fight React's reconciliation, so when a drag ends the node is put back where it was and the
// caller is told the old/new index; the caller reorders its own state and React renders the new order.
// The children of the container must be the draggable rows, rendered in list order with stable keys.
// Cross-list drags (Sortable `group` pull/put between two containers) and `pull: "clone"` are not supported;
// `group` may still be passed to keep separate lists from accepting each other's items.
import { useEffect, useRef, type RefObject } from "react";
import Sortable from "sortablejs";

export interface SortableReorderEvent {
  /** Index of the item before the drag (among the draggable children). */
  oldIndex: number;
  /** Index the item was dropped at (among the draggable children). */
  newIndex: number;
}

export interface UseSortableOptions {
  /** Called when an item was dropped at a different position. The DOM has already been restored. */
  onReorder?: (event: SortableReorderEvent) => void;
  /** Called when a drag starts (Vue `@start`). */
  onStart?: (event: Sortable.SortableEvent) => void;
  /** Called when a drag ends, whether or not the order changed (Vue `@end`), after the DOM was restored. */
  onEnd?: (event: Sortable.SortableEvent) => void;
  /** CSS selector of the element that starts a drag, e.g. ".handle". */
  handle?: string;
  /** Selector of the draggable children (default: all children). */
  draggable?: string;
  /** Animation duration in ms (0 = none). */
  animation?: number;
  /** Time in ms before a drag starts. */
  delay?: number;
  /** Apply `delay` only for touch input. */
  delayOnTouchOnly?: boolean;
  /** Class of the ghost element shown at the drop position. */
  ghostClass?: string;
  chosenClass?: string;
  dragClass?: string;
  /** Group name (or Sortable group options) used to keep lists apart. */
  group?: string | Sortable.GroupOptions;
  /** Selector of elements that cannot start a drag. */
  filter?: string;
  /** Do not start drags while true. */
  disabled?: boolean;
}

/** Returns a copy of `list` with the item at `oldIndex` moved to `newIndex`. */
export function moveItem<T>(list: readonly T[], oldIndex: number, newIndex: number): T[] {
  if (oldIndex === newIndex || oldIndex < 0 || oldIndex >= list.length || newIndex < 0 || newIndex >= list.length) {
    return [...list];
  }
  const next = [...list];
  const [item] = next.splice(oldIndex, 1);
  next.splice(newIndex, 0, item as T);
  return next;
}

/**
 * Makes the children of `containerRef` sortable. Sortable is created when the container element is mounted,
 * re-created when the element is replaced (e.g. a list rendered only while it has items) or a (non-callback) option
 * changes, and destroyed on unmount. Callbacks always see their latest closure.
 */
export function useSortable<E extends HTMLElement>(containerRef: RefObject<E | null>, options: UseSortableOptions) {
  const callbacks = useRef(options);
  useEffect(() => {
    callbacks.current = options;
  });

  const { handle, draggable, animation, delay, delayOnTouchOnly, ghostClass, chosenClass, dragClass, filter, disabled } = options;
  const groupKey = typeof options.group === "string" ? options.group : JSON.stringify(options.group ?? null);
  const optionsKey = JSON.stringify([handle, draggable, animation, delay, delayOnTouchOnly, ghostClass, chosenClass, dragClass, filter, disabled, groupKey]);

  const instance = useRef<{ element: E; optionsKey: string; sortable: Sortable } | null>(null);

  // Runs after every render: the ref object is stable, the element it points to is not, so compare the element.
  useEffect(() => {
    const container = containerRef.current;
    const current = instance.current;
    if (current?.element === container && current?.optionsKey === optionsKey) {
      return;
    }
    current?.sortable.destroy();
    instance.current = null;
    if (!container) {
      return;
    }

    // where the dragged node sat before Sortable moved it
    let origin: { parent: Node | null; next: Node | null } = { parent: null, next: null };

    const sortable = Sortable.create(container, {
      handle,
      draggable,
      animation,
      delay,
      delayOnTouchOnly,
      ghostClass,
      chosenClass,
      dragClass,
      filter,
      disabled,
      group: callbacks.current.group,
      onStart(event) {
        origin = { parent: event.item.parentNode, next: event.item.nextSibling };
        callbacks.current.onStart?.(event);
      },
      onEnd(event) {
        // undo Sortable's DOM move; React renders the new order from the caller's state
        const { item } = event;
        if (origin.parent && (item.parentNode !== origin.parent || item.nextSibling !== origin.next)) {
          origin.parent.insertBefore(item, origin.next && origin.next.parentNode === origin.parent ? origin.next : null);
        }

        const oldIndex = event.oldDraggableIndex ?? event.oldIndex;
        const newIndex = event.newDraggableIndex ?? event.newIndex;
        if (oldIndex !== undefined && newIndex !== undefined && oldIndex !== newIndex && event.from === event.to) {
          callbacks.current.onReorder?.({ oldIndex, newIndex });
        }
        callbacks.current.onEnd?.(event);
      },
    });
    instance.current = { element: container, optionsKey, sortable };
  });

  useEffect(() => () => {
    instance.current?.sortable.destroy();
    instance.current = null;
  }, []);
}

/** `useSortable` for the common case of reordering one array held in state. */
export function useSortableList<T, E extends HTMLElement>(
  containerRef: RefObject<E | null>,
  list: readonly T[],
  onListChange: (list: T[]) => void,
  options: Omit<UseSortableOptions, "onReorder"> & { onReorder?: (event: SortableReorderEvent) => void } = {},
) {
  const latest = useRef({ list, onListChange });
  useEffect(() => {
    latest.current = { list, onListChange };
  });

  useSortable(containerRef, {
    ...options,
    onReorder(event) {
      options.onReorder?.(event);
      onListChange(moveItem(latest.current.list, event.oldIndex, event.newIndex));
    },
  });
}
