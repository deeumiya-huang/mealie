import { useEffect, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router";
import Box from "@mui/material/Box";
import { DataTable } from "~/components/global/DataTable";
import type { DataTableHeader } from "~/components/global/DataTable";
import { UserAvatar } from "~/components/Domain/User/UserAvatar";
import { useUserApi } from "~/hooks/api";
import { useI18n } from "~/hooks/use-global-i18n";
import { useMealieAuth } from "~/hooks/use-mealie-auth";
import type { Recipe } from "~/lib/api/types/recipe";
import type { UserSummary } from "~/lib/api/types/user";
import { RecipeChips } from "./RecipeChips";
import type { RecipeChipsProps } from "./RecipeChips";

export interface RecipeDataTableShowHeaders {
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

export interface RecipeDataTableProps {
  loading?: boolean;
  recipes?: Recipe[];
  showHeaders?: RecipeDataTableShowHeaders;
  search?: string;
  selected: Recipe[];
  onSelectedChange: (recipes: Recipe[]) => void;
  onClick?: () => void;
}

const defaultShowHeaders: RecipeDataTableShowHeaders = {
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

export function RecipeDataTable({ loading = false, recipes = [], showHeaders = defaultShowHeaders, search, selected, onSelectedChange, onClick }: RecipeDataTableProps) {
  const i18n = useI18n();
  const auth = useMealieAuth();
  const groupSlug = auth.user?.groupSlug;
  const navigate = useNavigate();
  const api = useUserApi();

  // ============
  // Group Members
  const [members, setMembers] = useState<UserSummary[]>([]);
  useEffect(() => {
    void api.groups.fetchMembers().then(({ data }) => {
      if (data) setMembers(data.items);
    });
  }, [api]);

  function getMember(id: string) {
    if (members[0]) {
      return members.find(m => m.id === id)?.fullName;
    }
    return i18n.t("general.none");
  }

  const filterItems: RecipeChipsProps["onItemSelected"] = (item, itemType) => {
    if (!groupSlug || !item.id) {
      return;
    }
    void navigate(`/g/${groupSlug}?${itemType}=${item.id}`);
  };

  const headers: DataTableHeader<Recipe>[] = [];
  if (showHeaders.id) {
    headers.push({ title: i18n.t("general.id"), key: "id" });
  }
  if (showHeaders.owner) {
    headers.push({
      title: i18n.t("general.owner"),
      key: "userId",
      align: "center",
      sortable: true,
      render: item => (
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <UserAvatar userId={item.userId!} tooltip={false} size="40" />
          <Box sx={{ pl: 1 }}>{getMember(item.userId!)}</Box>
        </Box>
      ),
    });
  }
  headers.push({
    title: i18n.t("general.name"),
    key: "name",
    sortable: true,
    render: item => (
      <RouterLink to={`/g/${groupSlug}/r/${item.slug}`} style={{ color: "inherit", textDecoration: "inherit" }} onClick={() => onClick?.()}>
        {item.name}
      </RouterLink>
    ),
  });
  if (showHeaders.categories) {
    headers.push({
      title: i18n.t("recipe.categories"),
      key: "recipeCategory",
      sortable: true,
      render: item => <RecipeChips small items={item.recipeCategory} onItemSelected={filterItems} />,
    });
  }
  if (showHeaders.tags) {
    headers.push({
      title: i18n.t("tag.tags"),
      key: "tags",
      sortable: true,
      render: item => <RecipeChips small items={item.tags} urlPrefix="tags" onItemSelected={filterItems} />,
    });
  }
  if (showHeaders.tools) {
    headers.push({
      title: i18n.t("tool.tools"),
      key: "tools",
      sortable: true,
      render: item => <RecipeChips small items={item.tools} urlPrefix="tools" onItemSelected={filterItems} />,
    });
  }
  if (showHeaders.recipeServings) {
    headers.push({ title: i18n.t("recipe.servings"), key: "recipeServings", sortable: true });
  }
  if (showHeaders.recipeYieldQuantity) {
    headers.push({ title: i18n.t("recipe.yield"), key: "recipeYieldQuantity", sortable: true });
  }
  if (showHeaders.recipeYield) {
    headers.push({ title: i18n.t("recipe.yield-text"), key: "recipeYield", sortable: true });
  }
  if (showHeaders.dateAdded) {
    headers.push({
      title: i18n.t("general.date-added"),
      key: "dateAdded",
      sortable: true,
      render: item => (item.dateAdded ? i18n.d(new Date(item.dateAdded)) : ""),
    });
  }

  return (
    <DataTable<Recipe>
      itemKey="id"
      showSelect
      // default sorting by dateAdded descending
      sortBy={[{ key: "dateAdded", order: "desc" }]}
      headers={headers}
      items={recipes}
      itemsPerPage={15}
      elevation={0}
      loading={loading}
      search={search}
      selected={selected}
      onSelectedChange={onSelectedChange}
    />
  );
}

export default RecipeDataTable;
