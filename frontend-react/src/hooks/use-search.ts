// Port of composables/use-search.ts (fuzzy/ranked item search; same ranking tiers and Fuse options).
// `useSearch(items, options)` -> `{ search, setSearch, debouncedSearch, filtered, reset }` (the Vue refs become
// a value + setter; `items` is a plain array, recomputed when its identity changes).
import { useMemo, useState } from "react";
import Fuse, { type IFuseOptions } from "fuse.js";
import { normalize } from "@/hooks/use-utils";
import { useDebouncedValue } from "@/hooks/utils";

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

// Fuse handles only the fuzzy tier — typos like "bannana" → "banana". The
// deterministic tiers above already cover exact/prefix/substring matches,
// so Fuse is intentionally tight here: a low threshold rejects loose
// matches, and we let location matter again so an earlier match scores
// better than a late one.
const DEFAULT_FUSE_OPTIONS: IFuseOptions<ISearchItemInternal> = {
  keys: [
    { name: "name", weight: 3 },
    { name: "pluralName", weight: 3 },
    { name: "abbreviation", weight: 2 },
    { name: "pluralAbbreviation", weight: 2 },
    { name: "aliasesText", weight: 1 },
  ],
  ignoreLocation: false,
  shouldSort: true,
  threshold: 0.3,
  minMatchCharLength: 2,
  findAllMatches: false,
  includeScore: true,
};

export function useSearch<T extends ISearchableItem>(items: T[], options: ISearchOptions = {}) {
  const { debounceMs = 0, minSearchLength = 1, fuseOptions: customFuseOptions } = options;

  const [search, setSearch] = useState("");
  // `debounceMs` of 0 applies the search immediately (VueUse's 0 ms debounce settles on the next tick).
  const settledSearch = useDebouncedValue(search, debounceMs);
  const debouncedSearch = debounceMs === 0 ? search : settledSearch;

  // Flatten item aliases to include as searchable text
  const searchItems = useMemo(() => items.map((item): ISearchItemInternal => ({
    ...item,
    aliasesText: item.aliases ? item.aliases.map(a => a.name).join(" ") : "",
  })), [items]);

  const fuse = useMemo(
    () => new Fuse(searchItems, { ...DEFAULT_FUSE_OPTIONS, ...customFuseOptions }),
    [searchItems, customFuseOptions],
  );

  const filtered = useMemo(() => {
    const searchTerm = debouncedSearch.trim();

    // If no search query or less than minSearchLength characters, return all items
    if (!searchTerm || searchTerm.length < minSearchLength) {
      return items;
    }

    if (!items || items.length === 0) {
      return [];
    }

    const normalizedQuery = normalize(searchTerm);
    if (!normalizedQuery) {
      return items;
    }

    // Built once per query rather than per candidate string per item.
    const wordPrefixRe = new RegExp(`(?:^|\\s)${escapeRegExp(normalizedQuery)}`);

    const ranked: RankedHit<T>[] = [];
    let hasFuzzyPool = false;

    for (let i = 0; i < searchItems.length; i++) {
      const internal = searchItems[i];
      const original = items[i];
      if (!internal || !original) continue;

      const { tier, matchLength } = rankItem(internal, normalizedQuery, wordPrefixRe);
      if (tier === TIER_NONE) {
        hasFuzzyPool = true;
        continue;
      }
      ranked.push({ item: original, tier, matchLength, fuseScore: 0 });
    }

    if (hasFuzzyPool) {
      const rankedIds = new Set(ranked.map(r => r.item.id));
      // Fuse indexes the raw item fields, so a normalized query would be scored against
      // un-normalized text, and every stripped accent would count against the threshold.
      const fuzzyHits = fuse.search(searchTerm);
      const byId = new Map(items.map(it => [it.id, it]));
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
  }, [debouncedSearch, items, searchItems, fuse, minSearchLength]);

  const reset = () => setSearch("");

  return { search, setSearch, debouncedSearch, filtered, reset };
}
