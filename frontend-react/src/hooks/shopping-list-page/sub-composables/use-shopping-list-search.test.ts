import { act, renderHook } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { SEARCH_MIN_LIST_SIZE, useShoppingListSearch } from "./use-shopping-list-search";
import type { ShoppingListItemOut } from "@/lib/api/types/household";

// overrides are loosely typed on purpose: the cases pass partial labels, like the Vue test did
function listItem(id: string, overrides: Record<string, unknown> = {}): ShoppingListItemOut {
  return {
    id,
    shoppingListId: "list",
    groupId: "group",
    householdId: "household",
    ...overrides,
  } as ShoppingListItemOut;
}

/**
 * `matchesSearch` reads `debouncedSearch`, which in `useSearch` follows `search` immediately (a debounce of 0),
 * so setting the query is synchronous here, as in use-search.test.ts. Read the returned composable through
 * `result.current`.
 */
function searchFor(items: ShoppingListItemOut[], query: string) {
  const { result } = renderHook(() => useShoppingListSearch(items));
  act(() => {
    result.current.setSearch(query);
  });
  return result;
}

describe("useShoppingListSearch matching", () => {
  test("an empty query matches every item and is not 'searching'", () => {
    const items = [listItem("a", { note: "Kitchen roll" }), listItem("b", { note: "Bread" })];
    const { isSearching, matchesSearch, countMatches, hasMatches } = searchFor(items, "").current;

    expect(isSearching).toBe(false);
    expect(items.every(matchesSearch)).toBe(true);
    expect(countMatches(items)).toBe(2);
    expect(hasMatches(items)).toBe(true);
  });

  test("matches a note-only item by its note text", () => {
    const items = [listItem("a", { note: "Kitchen roll" }), listItem("b", { note: "Bread" })];
    const { matchesSearch } = searchFor(items, "kitchen").current;

    expect(items.filter(matchesSearch).map(i => i.id)).toEqual(["a"]);
  });

  test("matches a food-backed item by food name", () => {
    const items = [
      listItem("a", { food: { id: "f1", name: "Avocado" } }),
      listItem("b", { food: { id: "f2", name: "Bread" } }),
    ];
    const { matchesSearch } = searchFor(items, "avocado").current;

    expect(items.filter(matchesSearch).map(i => i.id)).toEqual(["a"]);
  });

  test("matches a food-backed item by its note as well as its food", () => {
    const items = [
      listItem("a", { food: { id: "f1", name: "Avocado" }, note: "ripe ones" }),
      listItem("b", { food: { id: "f2", name: "Bread" } }),
    ];
    const { matchesSearch } = searchFor(items, "ripe").current;

    expect(items.filter(matchesSearch).map(i => i.id)).toEqual(["a"]);
  });

  test("matches a food alias", () => {
    const items = [
      listItem("a", { food: { id: "f1", name: "Aubergine", aliases: [{ name: "Eggplant" }] } }),
      listItem("b", { food: { id: "f2", name: "Bread" } }),
    ];
    const { matchesSearch } = searchFor(items, "eggplant").current;

    expect(items.filter(matchesSearch).map(i => i.id)).toEqual(["a"]);
  });

  test("matches on label name, so searching an aisle narrows the list to it", () => {
    const items = [
      listItem("a", { note: "Persil Non Bio", label: { name: "Laundry" } }),
      listItem("b", { note: "Comfort Fresh", label: { name: "Laundry" } }),
      listItem("c", { note: "Bread", label: { name: "Bakery" } }),
    ];
    const { matchesSearch, countMatches } = searchFor(items, "laundry").current;

    expect(items.filter(matchesSearch).map(i => i.id)).toEqual(["a", "b"]);
    expect(countMatches(items)).toBe(2);
  });

  test("a query that matches nothing yields no matches", () => {
    const items = [listItem("a", { note: "Kitchen roll" }), listItem("b", { note: "Bread" })];
    const { matchesSearch, countMatches, hasMatches } = searchFor(items, "zzzznope").current;

    expect(items.some(matchesSearch)).toBe(false);
    expect(countMatches(items)).toBe(0);
    expect(hasMatches(items)).toBe(false);
  });

  test("clearSearch restores every item", () => {
    const items = [listItem("a", { note: "Kitchen roll" }), listItem("b", { note: "Bread" })];
    const composable = searchFor(items, "bread");
    expect(composable.current.countMatches(items)).toBe(1);

    act(() => {
      composable.current.clearSearch();
    });
    expect(composable.current.isSearching).toBe(false);
    expect(composable.current.countMatches(items)).toBe(2);
  });
});

describe("useShoppingListSearch fuzzy noise", () => {
  test("does not match items that merely look similar to the query", () => {
    // Grouping the list by label removes any notion of a weaker match sorting
    // lower, so a fuzzy hit would read as a real one. These are the cases a
    // fuzzy tier actually produced against a real list.
    const items = [
      listItem("wash-liquid", { note: "Washing up liquid" }),
      listItem("wash-gloves", { note: "Washing up gloves" }),
      listItem("stash", { note: "Extra chocolate treat - secret surprise stash" }),
      listItem("cash", { note: "Get cash out" }),
    ];
    const { matchesSearch } = searchFor(items, "cash").current;

    expect(items.filter(matchesSearch).map(i => i.id)).toEqual(["cash"]);
  });

  test("a query with no real match returns nothing rather than a near-miss", () => {
    const items = [
      listItem("a", { note: "Twinings honey & camomile tea" }),
      listItem("b", { note: "Toilet paper, family pack of 16" }),
    ];
    const { matchesSearch, hasMatches } = searchFor(items, "milk").current;

    expect(items.some(matchesSearch)).toBe(false);
    expect(hasMatches(items)).toBe(false);
  });

  test("a multi-word query matches as a phrase, like every other search in the app", () => {
    // useSearch matches the query as a single string rather than as independent
    // terms, so word order matters. Kept as a test because it is the one
    // behaviour that differs from a naive per-term matcher.
    const items = [
      listItem("beans", { note: "Green beans, bags" }),
      listItem("peppers", { note: "Green peppers" }),
    ];

    expect(items.filter(searchFor(items, "green bean").current.matchesSearch).map(i => i.id))
      .toEqual(["beans"]);
    expect(items.filter(searchFor(items, "bean green").current.matchesSearch))
      .toEqual([]);
  });
});

describe("useShoppingListSearch toggle", () => {
  const items = (count: number) => Array.from({ length: count }, (_, i) => listItem(`${i}`, { note: `Item ${i}` }));

  test(`is only offered once the list has more than ${SEARCH_MIN_LIST_SIZE} items`, () => {
    const { result, rerender } = renderHook(
      ({ list }) => useShoppingListSearch(list),
      { initialProps: { list: items(SEARCH_MIN_LIST_SIZE) } },
    );
    expect(result.current.canSearch).toBe(false);

    rerender({ list: items(SEARCH_MIN_LIST_SIZE + 1) });
    expect(result.current.canSearch).toBe(true);
  });

  test("starts closed and opens on toggle", () => {
    const list = items(30);
    const { result } = renderHook(() => useShoppingListSearch(list));
    expect(result.current.isSearchOpen).toBe(false);

    act(() => {
      result.current.toggleSearch();
    });
    expect(result.current.isSearchOpen).toBe(true);
  });

  test("closing the field clears the query, so nothing stays hidden", () => {
    const list = items(30);
    const { result } = renderHook(() => useShoppingListSearch(list));
    act(() => {
      result.current.toggleSearch();
    });
    act(() => {
      result.current.setSearch("Item 1");
    });
    expect(result.current.search).toBe("Item 1");
    expect(result.current.debouncedSearch).toBe("Item 1");
    expect(result.current.isSearching).toBe(true);

    act(() => {
      result.current.toggleSearch();
    });
    expect(result.current.isSearchOpen).toBe(false);
    expect(result.current.search).toBe("");
    expect(result.current.isSearching).toBe(false);
    expect(result.current.countMatches(list)).toBe(30);
  });
});
