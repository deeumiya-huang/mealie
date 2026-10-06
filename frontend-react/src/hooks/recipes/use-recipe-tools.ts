import { useCallback, useEffect, useState } from "react";
import { useUserApi } from "@/hooks/api";
import type { RecipeTool } from "@/lib/api/types/recipe";

/** What `createOne` needs from the form (Vue `VForm`). */
export interface ToolFormHandle {
  validate: () => unknown;
  reset: () => void;
}

const emptyTool = (): RecipeTool => ({
  id: "",
  name: "",
  slug: "",
});

/**
 * Port of `useTools`. Vue's `tools` was the `useAsyncData` result ref (or an empty ref when not
 * eager) and `workingToolData` a reactive object bound with v-model; here `tools` is state and
 * `workingToolData` is state with `setWorkingToolData` (accepts a partial patch).
 */
export const useTools = function (eager = true) {
  const api = useUserApi();
  const [workingToolData, setWorkingTool] = useState<RecipeTool>(emptyTool);
  const [loading, setLoading] = useState(false);
  const [tools, setTools] = useState<RecipeTool[] | null>(eager ? null : []);

  const setWorkingToolData = useCallback((patch: Partial<RecipeTool>) => {
    setWorkingTool(current => ({ ...current, ...patch }));
  }, []);

  const reset = useCallback(() => {
    setWorkingTool(current => ({ ...current, name: "", id: "" }));
    setLoading(false);
  }, []);

  const getAll = useCallback(async () => {
    const { data } = await api.tools.getAll();
    const items = data ? data.items : null;
    setTools(items);
    return items;
  }, [api]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    const { data } = await api.tools.getAll();

    if (data) {
      setTools(data.items);
    }

    setLoading(false);
  }, [api]);

  const createOne = useCallback(async (domForm: ToolFormHandle | null = null) => {
    if (domForm) {
      domForm.validate();
    }

    setLoading(true);

    const { data } = await api.tools.createOne(workingToolData);

    if (data) {
      setTools(current => (current ? [...current, data] : current));
    }

    domForm?.reset();
    reset();
  }, [api, workingToolData, reset]);

  const updateOne = useCallback(async () => {
    setLoading(true);
    const { data } = await api.tools.updateOne(workingToolData.id, workingToolData);
    if (data) {
      setTools(current => (current ? [...current, data] : current));
    }
    reset();
  }, [api, workingToolData, reset]);

  const deleteOne = useCallback(async (id: number | string) => {
    setLoading(true);
    await api.tools.deleteOne(id);
    reset();
  }, [api, reset]);

  useEffect(() => {
    if (!eager) {
      return;
    }
    let active = true;
    void api.tools.getAll().then(({ data }) => {
      if (active) {
        setTools(data ? data.items : null);
      }
    });
    return () => {
      active = false;
    };
  }, [api, eager]);

  const actions = { getAll, refreshAll, createOne, updateOne, deleteOne, reset };

  return {
    tools,
    actions,
    workingToolData,
    setWorkingToolData,
    loading,
  };
};
