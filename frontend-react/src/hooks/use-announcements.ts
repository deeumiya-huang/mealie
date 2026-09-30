import { useEffect } from "react";
import type { ComponentType } from "react";
import { userApi } from "~/hooks/api";
import { getAuthBackend } from "~/hooks/use-auth-backend";
import { useMealieAuth } from "~/hooks/use-mealie-auth";
import { useHouseholdSelf } from "~/hooks/use-households";
import { useGroupSelf } from "~/hooks/use-groups";
import { createStore, useStore } from "~/lib/store";

export type AnnouncementMeta = {
  title: string | undefined;
};

export type Announcement = {
  key: string;
  component: ComponentType;
  date: Date | undefined;
  meta: AnnouncementMeta | undefined;
};

const _announcementsUnsorted = import.meta.glob<{ default: ComponentType; meta?: AnnouncementMeta }>(
  "~/components/Domain/Announcement/Announcements/[0-9]*.tsx",
  { eager: true },
);

export const allAnnouncements: Announcement[] = Object.entries(_announcementsUnsorted)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, mod]) => {
    const key = path.split("/").at(-1)!.replace(".tsx", "");

    const dateParts = key.split("_", 1)[0]!.split("-").map(Number);
    const parsed = dateParts.length === 3
      ? new Date(dateParts[0]!, dateParts[1]! - 1, dateParts[2]!)
      : new Date(NaN);
    const date = isNaN(parsed.getTime()) ? undefined : parsed;

    return { key, component: mod.default, date, meta: mod.meta };
  });

const newAnnouncementsStore = createStore<Announcement[]>([]);
let initializedForUser: string | undefined | null = null;

function isWelcomeAnnouncement(key: string) {
  return key === allAnnouncements.at(0)!.key;
}

function updateUnreadAnnouncements(lastReadKey: string) {
  newAnnouncementsStore.set(allAnnouncements.filter(a => a.key > lastReadKey));
}

function initUnreadAnnouncements() {
  const user = getAuthBackend().getUser();

  // Only logged-in users can see announcements
  if (!user || !allAnnouncements.length) {
    newAnnouncementsStore.set([]);
    return;
  }

  // If a user has never seen an announcement, show them only the welcome announcement
  if (!user.lastReadAnnouncement) {
    newAnnouncementsStore.set([allAnnouncements.at(0)!]);
    return;
  }

  // Return all announcements newer than the last read announcement
  updateUnreadAnnouncements(user.lastReadAnnouncement);
}

async function setLastRead(key: string) {
  const user = getAuthBackend().getUser()!;

  if (!user.lastReadAnnouncement && isWelcomeAnnouncement(key)) {
    // The welcome announcement is a special case: it's shown to new users and
    // all other announcements are marked as read when they view it
    key = allAnnouncements.at(-1)!.key;
    updateUnreadAnnouncements(key);
  }
  else {
    // Only mark this specific announcement as read in the current session
    newAnnouncementsStore.set(newAnnouncementsStore.get().filter(a => a.key !== key));
  }

  if (user.lastReadAnnouncement && key <= user.lastReadAnnouncement) {
    // Don't update the last read announcement if it's older than the current one
    return;
  }

  user.lastReadAnnouncement = key; // update immediately so we don't have to wait for the db
  await userApi().users.updateOne(
    user.id,
    { ...user, lastReadAnnouncement: key },
    { suppressAlert: true },
  );
}

async function markAllAsRead() {
  void setLastRead(allAnnouncements.at(-1)!.key);
  newAnnouncementsStore.set([]);
}

export function useAnnouncements() {
  const auth = useMealieAuth();
  const { household } = useHouseholdSelf();
  const { group } = useGroupSelf();
  const newAnnouncements = useStore(newAnnouncementsStore);

  const announcementsEnabled = !!(
    auth.user?.showAnnouncements
    && household?.preferences?.showAnnouncements
    && group?.preferences?.showAnnouncements
  );

  // (Re-)initialise when the user changes
  const userId = auth.user?.id;
  useEffect(() => {
    if (initializedForUser === userId) return;
    initializedForUser = userId;
    initUnreadAnnouncements();
  }, [userId]);

  return {
    announcementsEnabled,
    newAnnouncements,
    allAnnouncements,
    setLastRead,
    markAllAsRead,
  };
}
