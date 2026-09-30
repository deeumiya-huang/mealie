import type { CSSProperties, ReactNode } from "react";
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import type { DragEndEvent, DraggableAttributes, DraggableSyntheticListeners } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export interface SortableHandleProps {
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners;
  /** Put on the element that should start a drag (vue-draggable-plus `handle`). */
  ref: (el: HTMLElement | null) => void;
}

export interface SortableListProps<T> {
  items: T[];
  getId: (item: T, index: number) => string;
  onReorder: (items: T[], from: number, to: number) => void;
  disabled?: boolean;
  /** With a handle, only the handle starts a drag; otherwise the whole item does. */
  useHandle?: boolean;
  /** Touch delay before a drag starts (vue-draggable-plus `delay` + `delayOnTouchOnly`). */
  touchDelay?: number;
  renderItem: (item: T, index: number, handle: SortableHandleProps) => ReactNode;
  className?: string;
  style?: CSSProperties;
}

function SortableItem({ id, disabled, useHandle, children }: { id: string; disabled: boolean; useHandle: boolean; children: (handle: SortableHandleProps) => ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined, // the "ghost" class
    position: "relative",
    zIndex: isDragging ? 1 : undefined,
  };
  const handle: SortableHandleProps = { attributes, listeners, ref: setActivatorNodeRef };
  return (
    <div ref={setNodeRef} style={style} {...(useHandle ? {} : { ...attributes, ...listeners })}>
      {children(handle)}
    </div>
  );
}

/** Vertical drag-and-drop list (vue-draggable-plus equivalent, built on dnd-kit). */
export function SortableList<T>({ items, getId, onReorder, disabled = false, useHandle = true, touchDelay = 250, renderItem, className, style }: SortableListProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: touchDelay, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = items.map((item, i) => getId(item, i));

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(items, from, to), from, to);
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy} disabled={disabled}>
        <div className={className} style={style}>
          {items.map((item, index) => (
            <SortableItem key={ids[index]} id={ids[index]!} disabled={disabled} useHandle={useHandle}>
              {handle => renderItem(item, index, handle)}
            </SortableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

export default SortableList;
