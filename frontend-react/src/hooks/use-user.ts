import { useCallback, useEffect, useRef, useState } from "react";
import { useAdminApi } from "@/hooks/api";
import { useAsyncData } from "@/hooks/utils";
import type { UserIn, UserOut } from "@/lib/api/types/user";

// Port of composables/use-user.ts.

/** All users (admin API), loaded on mount; `refreshAllUsers` reloads them (Vue `useLazyAsyncData`). */
export const useAllUsers = function () {
  const api = useAdminApi();
  // Vue used a fresh `Date.now()` key per call so the cached list never leaks between visits.
  const [asyncKey] = useState(() => String(Date.now()));
  const { data: users, refresh: refreshAllUsers } = useAsyncData<UserOut[] | null>(asyncKey, async () => {
    const { data } = await api.users.getAll();
    if (data) {
      return data.items;
    }
    else {
      return null;
    }
  });

  return { users, refreshAllUsers };
};

/**
 * User CRUD against the admin API. `refreshFunc` (e.g. `refreshAllUsers`) runs after every mutation.
 * Vue's `getUser(id)` returned a `useAsyncData` result; a hook cannot be created inside a function in
 * React, so it resolves to the user instead (no page uses it).
 */
export const useUser = function (refreshFunc: (() => unknown) | null = null) {
  const api = useAdminApi();
  const [loading, setLoading] = useState(false);
  // Always call the latest callback, not the one from the render that created these functions.
  const refreshRef = useRef(refreshFunc);
  useEffect(() => {
    refreshRef.current = refreshFunc;
  });

  const getUser = useCallback(async (id: string) => {
    setLoading(true);
    const { data } = await api.users.getOne(id);
    setLoading(false);
    return data;
  }, [api]);

  const createUser = useCallback(async (payload: UserIn) => {
    setLoading(true);
    const { data } = await api.users.createOne(payload);

    refreshRef.current?.();

    setLoading(false);
    return data;
  }, [api]);

  const deleteUser = useCallback(async (id: string) => {
    setLoading(true);
    const { data } = await api.users.deleteOne(id);
    setLoading(false);

    refreshRef.current?.();

    return data;
  }, [api]);

  const updateUser = useCallback(async (itemId: string, user: UserOut) => {
    setLoading(true);
    const { data } = await api.users.updateOne(itemId, user);
    setLoading(false);

    refreshRef.current?.();

    return data;
  }, [api]);

  return { loading, getUser, deleteUser, updateUser, createUser };
};
