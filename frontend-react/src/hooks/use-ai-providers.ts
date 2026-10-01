import { useMemo, useState } from "react";
import { useUserApi } from "~/hooks/api";
import type { AIProviderCreate, AIProviderUpdate } from "~/lib/api/types/group";

export function useAIProviders() {
  const api = useUserApi();
  const [loading, setLoading] = useState(false);

  const actions = useMemo(() => {
    async function withLoading<R>(fn: () => Promise<R>): Promise<R> {
      setLoading(true);
      try {
        return await fn();
      }
      finally {
        setLoading(false);
      }
    }

    return {
      getOne: (id: string) => withLoading(() => api.aiProviders.getOne(id)),
      createOne: (payload: AIProviderCreate) => withLoading(() => api.aiProviders.createOne(payload)),
      updateOne: (id: string, payload: AIProviderUpdate) => withLoading(() => api.aiProviders.updateOne(id, payload)),
      deleteOne: (id: string) => withLoading(() => api.aiProviders.deleteOne(id)),
      testOne: (payload: AIProviderCreate) => api.aiProviders.testOne(payload),
      testSavedOne: (id: string, overrides?: AIProviderUpdate & { apiKey?: string }) => api.aiProviders.testSavedOne(id, overrides),
    };
  }, [api]);

  return { loading, ...actions };
}
