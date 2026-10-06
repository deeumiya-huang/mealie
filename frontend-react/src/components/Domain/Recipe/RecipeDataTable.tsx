// Usage: <RecipeDataTable recipes={recipes} loading={loading} search={search} selected={selected}
//          onSelectedChange={setSelected} showHeaders={{ …, owner: true }} onClick={…} />
// Table of recipes (id, owner, name link, categories, tags, tools, servings, yield, date added) with selection, search
// and default sorting by date added (newest first). Vue `v-model` → `selected` + `onSelectedChange`; `@click` → `onClick`.
import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import { useNavigate } from "react-router";
import { BaseDataTable, type DataTableHeader } from "@/components/global/BaseDataTable";
import { UserAvatar } from "@/components/Domain/User/UserAvatar";
import { RecipeChips, type UrlPrefixParam } from "./RecipeChips";
import { useUserApi } from "@/hooks/api";
import { useMealieAuth } from "@/hooks/use-mealie-auth";
import { useI18n } from "@/i18n";
import type { Recipe, RecipeCategory, RecipeTag, RecipeTool } from "@/lib/api/types/recipe";
import type { UserSummary } from "@/lib/api/types/user";

export interface ShowHeaders {
  id: boolean;
  owner: boolean;
  tags: boolean;
  categories: boolean;
  tools: boolean;
  recipeServings: boolean;
  recipeYieldQuantity: boolean;
  recipeYield: boolean;
  dateAdded: boolean;
}

interface RecipeDataTableProps {
  loading?: boolean;
  recipes?: Recipe[];
  showHeaders?: ShowHeaders;
  search?: string;
  selected?: Recipe[];
  onSelectedChange?: (selected: Recipe[]) => void;
  onClick?: () => void;
}

const DEFAULT_SHOW_HEADERS: ShowHeaders = {
  id: true,
  owner: false,
  tags: true,
  categories: true,
  tools: true,
  recipeServings: true,
  recipeYieldQuantity: true,
  recipeYield: true,
  dateAdded: true,
};

const NO_RECIPES: Recipe[] = [];
const NO_SELECTION: Recipe[] = [];

// Initialize sort state with default sorting by dateAdded descending
const DEFAULT_SORT = [{ key: "dateAdded", order: "desc" as const }];

export function RecipeDataTable({
  loading = false,
  recipes = NO_RECIPES,
  showHeaders = DEFAULT_SHOW_HEADERS,
  search = "",
  selected = NO_SELECTION,
  onSelectedChange,
  onClick,
}: RecipeDataTableProps) {
  const { t, d } = useI18n();
  const auth = useMealieAuth();
  const groupSlug = auth.user?.groupSlug;
  const navigate = useNavigate();
  const api = useUserApi();

  const headers: DataTableHeader<Recipe>[] = [];

  if (showHeaders.id) {
    headers.push({ title: t("general.id"), key: "id", sortable: false });
  }
  if (showHeaders.owner) {
    headers.push({ title: t("general.owner"), key: "userId", align: "center", sortable: true });
  }
  headers.push({ title: t("general.name"), key: "name", sortable: true });
  if (showHeaders.categories) {
    headers.push({ title: t("recipe.categories"), key: "recipeCategory", sortable: true });
  }

  if (showHeaders.tags) {
    headers.push({ title: t("tag.tags"), key: "tags", sortable: true });
  }
  if (showHeaders.tools) {
    headers.push({ title: t("tool.tools"), key: "tools", sortable: true });
  }
  if (showHeaders.recipeServings) {
    headers.push({ title: t("recipe.servings"), key: "recipeServings", sortable: true });
  }
  if (showHeaders.recipeYieldQuantity) {
    headers.push({ title: t("recipe.yield"), key: "recipeYieldQuantity", sortable: true });
  }
  if (showHeaders.recipeYield) {
    headers.push({ title: t("recipe.yield-text"), key: "recipeYield", sortable: true });
  }
  if (showHeaders.dateAdded) {
    headers.push({ title: t("general.date-added"), key: "dateAdded", sortable: true });
  }

  // ============
  // Group Members
  const [members, setMembers] = useState<UserSummary[]>([]);

  useEffect(() => {
    let active = true;
    void api.groups.fetchMembers().then(({ data }) => {
      if (active && data) {
        setMembers(data.items);
      }
    });
    return () => {
      active = false;
    };
  }, [api]);

  function getMember(id: string) {
    if (members[0]) {
      return members.find(member => member.id === id)?.fullName;
    }

    return t("general.none");
  }

  function filterItems(item: RecipeTag | RecipeCategory | RecipeTool, itemType: UrlPrefixParam) {
    if (!groupSlug || !item.id) {
      return;
    }
    void navigate(`/g/${groupSlug}?${itemType}=${item.id}`);
  }

  return (
    <BaseDataTable<Recipe>
      headers={headers}
      items={recipes}
      itemKey="id"
      showSelect
      selected={selected}
      onSelectedChange={onSelectedChange}
      sortBy={DEFAULT_SORT}
      itemsPerPage={15}
      loading={loading}
      search={search}
      slots={{
        name: item => (
          <Box
            component="a"
            href={`/g/${groupSlug}/r/${item.slug}`}
            sx={{ color: "inherit", textDecoration: "inherit" }}
            onClick={() => onClick?.()}
          >
            {item.name}
          </Box>
        ),
        tags: item => (
          <RecipeChips small items={item.tags ?? []} urlPrefix="tags" onItemSelected={filterItems} />
        ),
        recipeCategory: item => (
          <RecipeChips small items={item.recipeCategory ?? []} onItemSelected={filterItems} />
        ),
        tools: item => (
          <RecipeChips small items={item.tools ?? []} urlPrefix="tools" onItemSelected={filterItems} />
        ),
        userId: item => (
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <UserAvatar userId={item.userId!} tooltip={false} size="40" />
            <Box sx={{ pl: 1 }}>
              <Box component="span" sx={{ textAlign: "left" }}>
                {getMember(item.userId!)}
              </Box>
            </Box>
          </Box>
        ),
        dateAdded: item => (item.dateAdded ? d(new Date(item.dateAdded)) : ""),
      }}
    />
  );
}
