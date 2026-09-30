import { useMealieAuth } from "~/hooks/use-mealie-auth";
import { useI18n } from "~/hooks/use-global-i18n";
import type { AnnouncementMeta } from "~/hooks/use-announcements";
import { AnnouncementBody, AnnouncementLink } from "./_shared";

export const meta: AnnouncementMeta = {
  title: "Welcome to Mealie 🎉",
};

export default function Announcement() {
  const { user } = useMealieAuth();
  const i18n = useI18n();
  return (
    <AnnouncementBody>
      <p>Welcome to Mealie! If this is your first time seeing announcements, here's what to expect.</p>
      <div style={{ marginBottom: 8 }}>
        Announcements are reserved for things like:
        <ul>
          <li>Important new features</li>
          <li>Major changes</li>
          <li>Anything that might require additional user actions (such as migration scripts)</li>
        </ul>
      </div>
      <p>
        While we generally keep everything in our <a href="https://github.com/mealie-recipes/mealie/releases" target="_blank" rel="noreferrer">GitHub release notes</a>,
        sometimes certain changes require some extra attention.
      </p>
      <p>
        Announcements are English-only; they're one-off messages from the maintainers, not a replacement for our release notes. Some elements may still be translated.
      </p>
      <hr />
      <p>
        You can opt out of announcements in your user settings:
        <br />
        <AnnouncementLink to="/user/profile/edit">{i18n.t("profile.user-settings")}</AnnouncementLink>
      </p>
      {user?.canManageHousehold && (
        <p style={{ marginTop: 12 }}>
          As {user?.admin ? "an admin" : "a household manager"}, you can disable announcements for your entire household:
          <br />
          <AnnouncementLink to="/household">{i18n.t("profile.household-settings")}</AnnouncementLink>
        </p>
      )}
      {user?.canManage && (
        <p style={{ marginTop: 12 }}>
          {user?.admin ? "You can also" : "As a group manager, you can"} disable announcements for your entire group:
          <br />
          <AnnouncementLink to="/group">{i18n.t("profile.group-settings")}</AnnouncementLink>
        </p>
      )}
    </AnnouncementBody>
  );
}
