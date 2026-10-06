import { useRef, useState } from "react";
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { moveItem, useSortable, useSortableList } from "./use-sortable";

interface FakeSortable {
  el: HTMLElement;
  options: Record<string, unknown>;
  destroy: ReturnType<typeof vi.fn>;
}

const sortables = vi.hoisted(() => [] as FakeSortable[]);

vi.mock("sortablejs", () => ({
  default: {
    create: (el: HTMLElement, options: Record<string, unknown>) => {
      const instance: FakeSortable = { el, options, destroy: vi.fn() };
      sortables.push(instance);
      return instance;
    },
  },
}));

type Handler = (event: Record<string, unknown>) => void;

interface ListProps {
  initial: string[];
  disabled?: boolean;
  onReorder?: (e: { oldIndex: number; newIndex: number }) => void;
}

function List({ initial, disabled = false, onReorder }: ListProps) {
  const ref = useRef<HTMLUListElement>(null);
  const [items, setItems] = useState(initial);
  useSortableList(ref, items, setItems, { handle: ".handle", animation: 200, disabled, onReorder });
  return (
    <ul ref={ref} data-testid="list">
      {items.map(item => <li key={item}>{item}</li>)}
    </ul>
  );
}

function names() {
  return screen.getAllByRole("listitem").map(li => li.textContent);
}

/** Simulates what Sortable does: moves the dragged node in the DOM, then reports the drag end. */
function dragTo(sortable: FakeSortable, fromIndex: number, toIndex: number) {
  const list = sortable.el;
  const item = list.children[fromIndex] as HTMLElement;
  (sortable.options.onStart as Handler)({ item });
  const reference = list.children[toIndex > fromIndex ? toIndex + 1 : toIndex] ?? null;
  list.insertBefore(item, reference);
  act(() => {
    (sortable.options.onEnd as Handler)({ item, from: list, to: list, oldIndex: fromIndex, newIndex: toIndex });
  });
}

beforeEach(() => {
  sortables.length = 0;
});

describe("moveItem", () => {
  test("moves an item forwards and backwards without mutating the input", () => {
    const list = ["a", "b", "c", "d"];
    expect(moveItem(list, 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveItem(list, 3, 1)).toEqual(["a", "d", "b", "c"]);
    expect(list).toEqual(["a", "b", "c", "d"]);
  });

  test("returns a copy for no-op or out-of-range moves", () => {
    const list = ["a", "b"];
    expect(moveItem(list, 1, 1)).toEqual(["a", "b"]);
    expect(moveItem(list, 5, 0)).toEqual(["a", "b"]);
    expect(moveItem(list, 0, -1)).toEqual(["a", "b"]);
  });
});

describe("useSortable", () => {
  test("creates Sortable on the container with the given options and destroys it on unmount", () => {
    const { unmount } = render(<List initial={["a", "b"]} />);
    expect(sortables).toHaveLength(1);
    expect(sortables[0]!.el).toBe(screen.getByTestId("list"));
    expect(sortables[0]!.options).toMatchObject({ handle: ".handle", animation: 200, disabled: false });

    unmount();
    expect(sortables[0]!.destroy).toHaveBeenCalledTimes(1);
  });

  test("re-creates Sortable when an option changes", () => {
    const { rerender } = render(<List initial={["a", "b"]} />);
    rerender(<List initial={["a", "b"]} disabled />);
    expect(sortables).toHaveLength(2);
    expect(sortables[0]!.destroy).toHaveBeenCalledTimes(1);
    expect(sortables[1]!.options.disabled).toBe(true);
  });

  test("reverts Sortable's DOM move and lets React render the new order", () => {
    const onReorder = vi.fn();
    render(<List initial={["a", "b", "c"]} onReorder={onReorder} />);
    const [first, second, third] = screen.getAllByRole("listitem");

    dragTo(sortables[0]!, 0, 2);

    expect(onReorder).toHaveBeenCalledWith({ oldIndex: 0, newIndex: 2 });
    expect(names()).toEqual(["b", "c", "a"]);
    // the same DOM nodes are reused (React moved them), none were duplicated or lost
    expect(screen.getAllByRole("listitem")).toEqual([second, third, first]);
  });

  test("does not report a reorder when the item is dropped where it was", () => {
    const onReorder = vi.fn();
    render(<List initial={["a", "b", "c"]} onReorder={onReorder} />);
    dragTo(sortables[0]!, 1, 1);
    expect(onReorder).not.toHaveBeenCalled();
    expect(names()).toEqual(["a", "b", "c"]);
  });

  test("calls onStart and onEnd and uses the latest callbacks", () => {
    const calls: string[] = [];
    function Host({ tag }: { tag: string }) {
      const ref = useRef<HTMLDivElement>(null);
      useSortable(ref, {
        onStart: () => calls.push(`start-${tag}`),
        onEnd: () => calls.push(`end-${tag}`),
        onReorder: ({ oldIndex, newIndex }) => calls.push(`reorder-${tag}-${oldIndex}-${newIndex}`),
      });
      return (
        <div ref={ref}>
          <span>one</span>
          <span>two</span>
        </div>
      );
    }
    const { rerender } = render(<Host tag="x" />);
    rerender(<Host tag="y" />);
    // changing callbacks does not re-create Sortable
    expect(sortables).toHaveLength(1);

    const sortable = sortables[0]!;
    const item = sortable.el.children[0] as HTMLElement;
    (sortable.options.onStart as Handler)({ item });
    act(() => {
      (sortable.options.onEnd as Handler)({ item, from: sortable.el, to: sortable.el, oldIndex: 0, newIndex: 1, oldDraggableIndex: 0, newDraggableIndex: 1 });
    });
    expect(calls).toEqual(["start-y", "reorder-y-0-1", "end-y"]);
  });

  test("ignores drops into another container", () => {
    const onReorder = vi.fn();
    render(<List initial={["a", "b"]} onReorder={onReorder} />);
    const sortable = sortables[0]!;
    const item = sortable.el.children[0] as HTMLElement;
    (sortable.options.onStart as Handler)({ item });
    act(() => {
      (sortable.options.onEnd as Handler)({ item, from: sortable.el, to: document.createElement("ul"), oldIndex: 0, newIndex: 1 });
    });
    expect(onReorder).not.toHaveBeenCalled();
    expect(names()).toEqual(["a", "b"]);
  });
});
