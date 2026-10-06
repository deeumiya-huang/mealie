import { useCallback, useState } from "react";
import { useUserApi } from "@/hooks/api";
import type { AIProviderCreate, AIProviderUpdate } from "@/lib/api/types/group";

export function useAIProviders() {
  const api = useUserApi();
  const [loading, setLoading] = useState(false);

  const getOne = useCallback(async (id: string) => {
    setLoading(true);
    try {
      return await api.aiProviders.getOne(id);
    }
    finally {
      setLoading(false);
    }
  }, [api]);

  const createOne = useCallback(async (payload: AIProviderCreate) => {
    setLoading(true);
    try {
      return await api.aiProviders.createOne(payload);
    }
    finally {
      setLoading(false);
    }
  }, [api]);

  const updateOne = useCallback(async (id: string, payload: AIProviderUpdate) => {
    setLoading(true);
    try {
      return await api.aiProviders.updateOne(id, payload);
    }
    finally {
      setLoading(false);
    }
  }, [api]);

  const deleteOne = useCallback(async (id: string) => {
    setLoading(true);
    try {
      return await api.aiProviders.deleteOne(id);
    }
    finally {
      setLoading(false);
    }
  }, [api]);

  const testOne = useCallback(async (payload: AIProviderCreate) => {
    return await api.aiProviders.testOne(payload);
  }, [api]);

  const testSavedOne = useCallback(async (id: string, overrides?: AIProviderUpdate & { apiKey?: string }) => {
    return await api.aiProviders.testSavedOne(id, overrides);
  }, [api]);

  return {
    loading,
    getOne,
    createOne,
    updateOne,
    deleteOne,
    testOne,
    testSavedOne,
  };
}
