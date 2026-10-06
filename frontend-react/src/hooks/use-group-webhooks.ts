import { useCallback, useState } from "react";
import { useUserApi } from "@/hooks/api";
import { useAsyncData } from "@/hooks/utils";
import type { ReadWebhook } from "@/lib/api/types/household";

export const useGroupWebhooks = function () {
  const api = useUserApi();
  const [loading, setLoading] = useState(false);
  const [validForm, setValidForm] = useState(true);

  const { data: webhooks, refresh: reloadWebhooks } = useAsyncData("group-webhooks", async () => {
    const { data } = await api.groupWebhooks.getAll();

    if (data) {
      return data.items;
    }
    else {
      return null;
    }
  }, [api]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await reloadWebhooks();
    setLoading(false);
  }, [reloadWebhooks]);

  const createOne = useCallback(async () => {
    setLoading(true);

    const payload = {
      enabled: true,
      name: "New Webhook",
      url: "",
      scheduledTime: "00:00",
    };

    const { data } = await api.groupWebhooks.createOne(payload);
    if (data) {
      await refreshAll();
    }

    setLoading(false);
  }, [api, refreshAll]);

  const updateOne = useCallback(async (updateData: ReadWebhook) => {
    if (!updateData.id) {
      return;
    }

    // Convert to UTC time
    const payload: ReadWebhook = { ...updateData, scheduledTime: timeLocalToUTC(updateData.scheduledTime) };

    setLoading(true);
    const { data } = await api.groupWebhooks.updateOne(updateData.id, payload);
    if (data) {
      await refreshAll();
    }
    setLoading(false);
  }, [api, refreshAll]);

  const deleteOne = useCallback(async (id: string | number) => {
    setLoading(true);
    const { data } = await api.groupWebhooks.deleteOne(id);
    if (data) {
      await refreshAll();
    }
    setLoading(false);
  }, [api, refreshAll]);

  const testOne = useCallback(async (id: string | number) => {
    setLoading(true);
    await api.groupWebhooks.testOne(id);
    setLoading(false);
  }, [api]);

  const actions = { refreshAll, createOne, updateOne, deleteOne, testOne };

  return { webhooks, actions, validForm, setValidForm, loading };
};

function pad(num: number, size: number) {
  let numStr = num.toString();
  while (numStr.length < size) numStr = "0" + numStr;
  return numStr;
}

export function timeUTC(time: string): Date {
  const [hours, minutes] = time.split(":");
  const dt = new Date();
  dt.setUTCMinutes(Number(minutes));
  dt.setUTCHours(Number(hours));
  return dt;
}

export function timeUTCToLocal(time: string): string {
  const dt = timeUTC(time);
  return `${pad(dt.getHours(), 2)}:${pad(dt.getMinutes(), 2)}`;
}

export function timeLocalToUTC(time: string) {
  const [hours, minutes] = time.split(":");
  const dt = new Date();
  dt.setHours(Number(hours));
  dt.setMinutes(Number(minutes));
  return `${pad(dt.getUTCHours(), 2)}:${pad(dt.getUTCMinutes(), 2)}`;
}
