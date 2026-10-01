import { useCallback, useEffect, useState } from "react";
import { useAdminApi } from "~/hooks/api";
import type { UserIn, UserOut } from "~/lib/api/types/user";

/** Every user on the instance (admin), fetched on mount. */
export const useAllUsers = function () {
  const api = useAdminApi();
  const [users, setUsers] = useState<UserOut[] | null>(null);

  const refreshAllUsers = useCallback(async () => {
    const { data } = await api.users.getAll();
    setUsers(data ? data.items : null);
  }, [api]);

  useEffect(() => {
    void refreshAllUsers();
  }, [refreshAllUsers]);

  return { users, refreshAllUsers };
};

/** Admin user CRUD; `refreshFunc` runs after every change (e.g. `useAllUsers().refreshAllUsers`). */
export const useUser = function (refreshFunc: (() => unknown) | null = null) {
  const api = useAdminApi();
  const [loading, setLoading] = useState(false);

  async function createUser(payload: UserIn) {
    setLoading(true);
    const { data } = await api.users.createOne(payload);

    if (refreshFunc) {
      void refreshFunc();
    }

    setLoading(false);
    return data;
  }

  async function deleteUser(id: string) {
    setLoading(true);
    const { data } = await api.users.deleteOne(id);
    setLoading(false);

    if (refreshFunc) {
      void refreshFunc();
    }

    return data;
  }

  async function updateUser(itemId: string, user: UserOut) {
    setLoading(true);
    const { data } = await api.users.updateOne(itemId, user);
    setLoading(false);

    if (refreshFunc) {
      void refreshFunc();
    }

    return data;
  }

  return { loading, deleteUser, updateUser, createUser };
};
