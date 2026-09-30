import { useEffect, useMemo, useRef, useState } from "react";
import type { IFuseOptions } from "fuse.js";
import Fuse from "fuse.js";
import { normalize } from "./use-utils";

export interface IAlias {
  name: string;
}

export interface ISearchableItem {
  id: string;
  name: string;
  pluralName?: string | null;
  abbreviation?: string | null;
  pluralAbbreviation?: string | null;
  aliases?: IAlias[] | undefined;
}

interface ISearchItemInternal extends ISearchableItem {
  aliasesText?: string | undefined;
}

export interface ISearchOptions {
  debounceMs?: number;
  maxWaitMs?: number;
  minSearchLength?: number;
  fuseOptions?: Partial<IFuseOptions<ISearchItemInternal>>;
}

// Ranking tiers (lower = stronger match). See `rankItem` for the rules.
const TIER_EXACT = 0;
const TIER_PREFIX = 1;
const TIER_WORD_PREFIX = 2;
const TIER_SUBSTRING = 3;
const TIER_FUZZY = 4;
const TIER_NONE = 5;

interface RankedHit<T> {
  item: T;
  tier: number;
  // Tiebreaker: length of the shortest matching field. Shorter = closer to the
  // query, so `bread` outranks `breadsticks` within the same tier.
  matchLength: number;
  // Fuse score, used only for the fuzzy tier.
  fuseScore: number;
}

function searchableStrings(item: ISearchItemInternal): string[] {
  const out: string[] = [item.name];
  if (item.pluralName) out.push(item.pluralName);
  if (item.abbreviation) out.push(item.abbreviation);
  if (item.pluralAbbreviation) out.push(item.pluralAbbreviation);
  if (item.aliases) {
    for (const alias of item.aliases) {
      if (alias.name) out.push(alias.name);
    }
  }
  return out;
}

function rankItem(
  item: ISearchItemInternal,
  query: string,
  wordPrefixRe: RegExp,
): { tier: number; matchLength: number } {
  let bestTier = TIER_NONE;
  let bestLength = Number.POSITIVE_INFINITY;

  for (const raw of searchableStrings(item)) {
    const candidate = normalize(raw);
    if (!candidate) continue;

    let tier: number;
    if (candidate === query) {
      tier = TIER_EXACT;
    }
    else if (candidate.startsWith(query)) {
      tier = TIER_PREFIX;
    }
    else if (wordPrefixRe.test(candidate)) {
      tier = TIER_WORD_PREFIX;
    }
    else if (candidate.includes(query)) {
      tier = TIER_SUBSTRING;
    }
    else {
      continue;
    }

    if (tier < bestTier || (tier === bestTier && candidate.length < bestLength)) {
      bestTier = tier;
      bestLength = candidate.length;
    }
  }

  return { tier: bestTier, matchLength: bestLength };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const defaultFuseOptions: IFuseOptions<ISearchItemInternal> = {
  keys: [
    { name: "name", weight: 3 },
    { name: "pluralName", weight: 3 },
    { name: "abbreviation", weight: 2 },
    { name: "pluralAbbreviation", weight: 2 },
    { name: "aliasesText", weight: 1 },
  ],
  // Fuse handles only the fuzzy tier — typos like "bannana" → "banana". The deterministic tiers
  // already cover exact/prefix/substring matches, so Fuse is intentionally tight here: a low
  // threshold rejects loose matches, and location matters so an earlier match scores better.
  ignoreLocation: false,
  shouldSort: true,
  threshold: 0.3,
  minMatchCharLength: 2,
  findAllMatches: false,
  includeScore: true,
};

function toInternal<T extends ISearchableItem>(items: T[]): ISearchItemInternal[] {
  // Flatten item aliases to include as searchable text
  return items.map(item => ({
    ...item,
    aliasesText: item.aliases ? item.aliases.map(a => a.name).join(" ") : "",
  }));
}

/** Ranks `items` against `query` (pure; the hook below adds state and debouncing). */
export function searchItems<T extends ISearchableItem>(
  itemsArray: T[],
  query: string,
  options: { minSearchLength?: number; fuse?: Fuse<ISearchItemInternal>; internal?: ISearchItemInternal[]; fuseOptions?: Partial<IFuseOptions<ISearchItemInternal>> } = {},
): T[] {
  const { minSearchLength = 1 } = options;
  const searchTerm = query.trim();

  // If no search query or less than minSearchLength characters, return all items
  if (!searchTerm || searchTerm.length < minSearchLength) {
    return itemsArray;
  }

  if (!itemsArray || itemsArray.length === 0) {
    return [];
  }

  const normalizedQuery = normalize(searchTerm);
  if (!normalizedQuery) {
    return itemsArray;
  }

  const internalItems = options.internal ?? toInternal(itemsArray);

  // Built once per query rather than per candidate string per item.
  const wordPrefixRe = new RegExp(`(?:^|\\s)${escapeRegExp(normalizedQuery)}`);

  const ranked: RankedHit<T>[] = [];
  const fuzzyPool: ISearchItemInternal[] = [];

  for (let i = 0; i < internalItems.length; i++) {
    const internal = internalItems[i];
    const original = itemsArray[i];
    if (!internal || !original) continue;

    const { tier, matchLength } = rankItem(internal, normalizedQuery, wordPrefixRe);
    if (tier === TIER_NONE) {
      fuzzyPool.push(internal);
      continue;
    }
    ranked.push({ item: original, tier, matchLength, fuseScore: 0 });
  }

  if (fuzzyPool.length > 0) {
    const rankedIds = new Set(ranked.map(r => r.item.id));
    const fuse = options.fuse ?? new Fuse(internalItems, { ...defaultFuseOptions, ...options.fuseOptions });
    // Fuse indexes the raw item fields, so a normalized query would be scored against
    // un-normalized text, and every stripped accent would count against the threshold.
    const fuzzyHits = fuse.search(searchTerm);
    const byId = new Map(itemsArray.map(it => [it.id, it]));
    for (const hit of fuzzyHits) {
      if (rankedIds.has(hit.item.id)) continue;
      const original = byId.get(hit.item.id);
      if (!original) continue;
      ranked.push({
        item: original,
        tier: TIER_FUZZY,
        matchLength: normalize(hit.item.name).length,
        fuseScore: hit.score ?? 1,
      });
    }
  }

  ranked.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    if (a.tier === TIER_FUZZY && a.fuseScore !== b.fuseScore) {
      return a.fuseScore - b.fuseScore;
    }
    if (a.matchLength !== b.matchLength) return a.matchLength - b.matchLength;
    return a.item.name.localeCompare(b.item.name);
  });

  return ranked.map(r => r.item);
}

export function useSearch<T extends ISearchableItem>(items: T[], options: ISearchOptions = {}) {
  const {
    debounceMs = 0,
    maxWaitMs = 1500,
    minSearchLength = 1,
    fuseOptions: customFuseOptions = {},
  } = options;

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input (with a max wait, like vueuse's watchDebounced).
  const firstPending = useRef<number | null>(null);
  useEffect(() => {
    if (debounceMs <= 0) {
      setDebouncedSearch(search);
      return;
    }
    const now = Date.now();
    firstPending.current ??= now;
    const waited = now - firstPending.current;
    const delay = Math.max(0, Math.min(debounceMs, maxWaitMs - waited));
    const timer = setTimeout(() => {
      firstPending.current = null;
      setDebouncedSearch(search);
    }, delay);
    return () => clearTimeout(timer);
  }, [search, debounceMs, maxWaitMs]);

  const internal = useMemo(() => toInternal(items), [items]);
  const fuse = useMemo(
    () => new Fuse(internal, { ...defaultFuseOptions, ...customFuseOptions }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- options are static per call site
    [internal],
  );

  const filtered = useMemo(
    () => searchItems(items, debouncedSearch, { minSearchLength, fuse, internal }),
    [items, debouncedSearch, minSearchLength, fuse, internal],
  );

  const reset = () => {
    setSearch("");
    setDebouncedSearch("");
  };

  return {
    search,
    setSearch,
    debouncedSearch,
    setDebouncedSearch,
    filtered,
    reset,
  };
}
