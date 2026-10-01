import { useCallback, useEffect, useMemo, useState } from "react";
import { useUserApi } from "~/hooks/api";
import type { ReadWebhook } from "~/lib/api/types/household";

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

export const useGroupWebhooks = function () {
  const api = useUserApi();
  const [loading, setLoading] = useState(false);
  const [webhooks, setWebhooks] = useState<ReadWebhook[] | null>(null);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    const { data } = await api.groupWebhooks.getAll();
    if (data && data.items) {
      setWebhooks(data.items);
    }
    setLoading(false);
  }, [api]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const actions = useMemo(() => ({
    refreshAll,
    async createOne() {
      setLoading(true);
      const { data } = await api.groupWebhooks.createOne({ enabled: true, name: "New Webhook", url: "", scheduledTime: "00:00" });
      if (data) {
        void refreshAll();
      }
      setLoading(false);
    },
    async updateOne(updateData: ReadWebhook) {
      if (!updateData.id) {
        return;
      }
      // Convert to UTC time
      const payload = { ...updateData, scheduledTime: timeLocalToUTC(updateData.scheduledTime) };
      setLoading(true);
      const { data } = await api.groupWebhooks.updateOne(updateData.id, payload);
      if (data) {
        void refreshAll();
      }
      setLoading(false);
    },
    async deleteOne(id: string | number) {
      setLoading(true);
      const { data } = await api.groupWebhooks.deleteOne(id);
      if (data) {
        void refreshAll();
      }
      setLoading(false);
    },
    async testOne(id: string | number) {
      setLoading(true);
      await api.groupWebhooks.testOne(id);
      setLoading(false);
    },
  }), [api, refreshAll]);

  return { webhooks, actions, loading };
};
