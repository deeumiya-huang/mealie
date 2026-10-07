import { useEffect, type ComponentType } from "react";
import { userApi } from "@/hooks/api/api-client";
import { authStore } from "@/hooks/use-auth-backend";
import { useGroupSelf } from "@/hooks/use-groups";
import { useHouseholdSelf } from "@/hooks/use-households";
import { useMealieAuth } from "@/hooks/use-mealie-auth";
import { createStore, useStore } from "@/lib/store";

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
  "@/components/Domain/Announcement/Announcements/*.tsx",
  { eager: true },
);
const allAnnouncements: Announcement[] = Object.entries(_announcementsUnsorted)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, mod]) => {
    const key = path.split("/").at(-1)!.replace(".tsx", "");

    const dateParts = key.split("_", 1)[0]!.split("-").map(Number);
    const parsed = dateParts.length === 3
      ? new Date(dateParts[0]!, dateParts[1]! - 1, dateParts[2]!)
      : new Date(NaN);
    const date = isNaN(parsed.getTime()) ? undefined : parsed;

    return {
      key,
      component: mod.default,
      date,
      meta: mod.meta,
    };
  });

const newAnnouncements = createStore<Announcement[]>([]);

function isWelcomeAnnouncement(key: string) {
  return key === allAnnouncements.at(0)!.key;
}

function updateUnreadAnnouncements(lastReadKey: string) {
  newAnnouncements.set(allAnnouncements.filter(a => a.key > lastReadKey));
}

async function setLastRead(key: string) {
  const user = authStore.get().user!;

  if (!user.lastReadAnnouncement && isWelcomeAnnouncement(key)) {
    // The welcome announcement is a special case: it's shown to new users and
    // all other announcements are marked as read when they view it
    key = allAnnouncements.at(-1)!.key;
    updateUnreadAnnouncements(key);
  }
  else {
    // Only mark this specific announcement as read in the current session
    newAnnouncements.set(current => current.filter(a => a.key !== key));
  }

  if (user.lastReadAnnouncement && key <= user.lastReadAnnouncement) {
    // Don't update the last read announcement if it's older than the current one
    return;
  }

  // update immediately so we don't have to wait for the db
  authStore.set(state => (state.user ? { ...state, user: { ...state.user, lastReadAnnouncement: key } } : state));
  await userApi.users.updateOne(
    user.id,
    {
      ...user,
      lastReadAnnouncement: key,
    },
    { suppressAlert: true },
  );
}

async function markAllAsRead() {
  void setLastRead(allAnnouncements.at(-1)!.key);
  newAnnouncements.set([]);
}

function initUnreadAnnouncements() {
  const user = authStore.get().user;

  // Only logged-in users can see announcements
  if (!user || !allAnnouncements.length) {
    newAnnouncements.set([]);
    return;
  }

  // If a user has never seen an announcement, show them only the welcome announcement
  if (!user.lastReadAnnouncement) {
    newAnnouncements.set([allAnnouncements.at(0)!]);
    return;
  }

  // Return all announcements newer than the last read announcement
  updateUnreadAnnouncements(user.lastReadAnnouncement);
}

/** Port of composables/use-announcements.ts. */
export function useAnnouncements() {
  const auth = useMealieAuth();
  const { household } = useHouseholdSelf();
  const { group } = useGroupSelf();
  const unread = useStore(newAnnouncements);

  const announcementsEnabled = !!(
    auth.user?.showAnnouncements
    && household?.preferences?.showAnnouncements
    && group?.preferences?.showAnnouncements
  );

  // Like Vue (init in every setup, re-init when the user changes): on mount and when the user changes
  const userId = auth.user?.id;
  useEffect(() => {
    initUnreadAnnouncements();
  }, [userId]);

  return {
    announcementsEnabled,
    newAnnouncements: unread,
    allAnnouncements,
    setLastRead,
    markAllAsRead,
  };
}
