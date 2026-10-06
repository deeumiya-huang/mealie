import { useCallback, useEffect, useState } from "react";
import { useUserApi } from "@/hooks/api";
import { registerCacheReset } from "@/hooks/use-clear-composable-caches";
import { createStore, useStore } from "@/lib/store";
import { loader } from "./use-toast";
import type { AllBackups, BackupOptions } from "@/lib/api/types/admin";

interface ImportBackup {
  name: string;
  options: BackupOptions;
}

const emptyBackups = (): AllBackups => ({
  imports: [],
  templates: [],
});

// Module state shared by every component (Vue: module-level ref).
const backups = createStore<AllBackups>(emptyBackups());

export function resetBackups() {
  backups.set(emptyBackups());
}
registerCacheReset(resetBackups);

function setBackups(newBackups: AllBackups | null) {
  if (newBackups) {
    backups.set(newBackups);
  }
}

function optionsFactory() {
  return {
    tag: "",
    templates: [] as string[],
    options: {
      recipes: true,
      settings: true,
      themes: true,
      pages: true,
      users: true,
      groups: true,
      notifications: true,
    },
  };
}

export const useBackups = function (fetch = true) {
  const api = useUserApi();
  const backupList = useStore(backups);

  const [backupOptions, setBackupOptions] = useState(optionsFactory);
  const [deleteTarget, setDeleteTarget] = useState("");

  const [selected, setSelected] = useState<ImportBackup | null>({
    name: "",
    options: {
      recipes: true,
      settings: true,
      themes: true,
      groups: true,
      users: true,
      notifications: true,
    },
  });

  // Vue returned the `useAsyncData` result; here it resolves to the backups.
  const getBackups = useCallback(async () => {
    const { data } = await api.backups.getAll();
    return data;
  }, [api]);

  const refreshBackups = useCallback(async () => {
    const { data } = await api.backups.getAll();
    if (data) {
      setBackups(data);
    }
  }, [api]);

  const createBackup = useCallback(async () => {
    loader.info("Creating Backup...");
    const { response } = await api.backups.createOne(backupOptions);

    if (response && response.status === 201) {
      void refreshBackups();
      loader.close();
      setBackupOptions(optionsFactory());
    }
  }, [api, backupOptions, refreshBackups]);

  const deleteBackup = useCallback(async () => {
    const { response } = await api.backups.deleteOne(deleteTarget);
    if (response && response.status === 200) {
      void refreshBackups();
    }
  }, [api, deleteTarget, refreshBackups]);

  const importBackup = useCallback(async () => {
    loader.info("Import Backup...");

    if (!selected) {
      return;
    }

    const { response } = await api.backups.restoreDatabase(selected.name, selected.options);

    if (response && response.status === 200) {
      void refreshBackups();
      loader.close();
    }
  }, [api, selected, refreshBackups]);

  useEffect(() => {
    if (fetch) {
      void refreshBackups();
    }
  }, [fetch, refreshBackups]);

  return {
    getBackups,
    refreshBackups,
    deleteBackup,
    importBackup,
    createBackup,
    backups: backupList,
    backupOptions,
    setBackupOptions,
    deleteTarget,
    setDeleteTarget,
    selected,
    setSelected,
  };
};
