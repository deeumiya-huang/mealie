import { useCallback, useState } from "react";
import { useUserApi } from "@/hooks/api";
import type { ShoppingListSummary } from "@/lib/api/types/household";

export function useAddToShoppingListDialog() {
  const api = useUserApi();
  const [shoppingLists, setShoppingLists] = useState<ShoppingListSummary[]>();
  const [open, setOpen] = useState(false);
  const [addAllLoading, setAddAllLoading] = useState(false);

  const getShoppingLists = useCallback(async () => {
    const { data } = await api.shopping.lists.getAll(1, -1, { orderBy: "name", orderDirection: "asc" });
    if (data) {
      setShoppingLists(data.items as ShoppingListSummary[] ?? []);
    }
  }, [api]);

  const addAllToList = useCallback(async () => {
    setAddAllLoading(true);
    await getShoppingLists();
    setOpen(true);
    setAddAllLoading(false);
  }, [getShoppingLists]);

  return {
    shoppingLists,
    open,
    setOpen,
    addAllLoading,
    getShoppingLists,
    addAllToList,
  };
}
