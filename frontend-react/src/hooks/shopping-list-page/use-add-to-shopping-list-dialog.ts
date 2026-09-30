import { useCallback, useState } from "react";
import type { ShoppingListSummary } from "~/lib/api/types/household";
import { useUserApi } from "~/hooks/api";

export function useAddToShoppingListDialog() {
  const api = useUserApi();
  const [shoppingLists, setShoppingLists] = useState<ShoppingListSummary[]>();
  const [open, setOpen] = useState(false);
  const [addAllLoading, setAddAllLoading] = useState(false);

  const getShoppingLists = useCallback(async () => {
    const { data } = await api.shopping.lists.getAll(1, -1, { orderBy: "name", orderDirection: "asc" });
    if (data) {
      setShoppingLists((data.items as ShoppingListSummary[]) ?? []);
    }
  }, [api]);

  async function addAllToList() {
    setAddAllLoading(true);
    await getShoppingLists();
    setOpen(true);
    setAddAllLoading(false);
  }

  return { shoppingLists, open, setOpen, addAllLoading, getShoppingLists, addAllToList };
}
