import Button from "@mui/material/Button";
import { Link } from "react-router";
import type { AnnouncementMeta } from "@/hooks/use-announcements";
import { useMealieAuth } from "@/hooks/use-mealie-auth";
import { useI18n } from "@/i18n";

// Announcements are English-only one-off messages from the maintainers (same text as the Vue file).
// eslint-disable-next-line react-refresh/only-export-components -- metadata sits next to the component, as in the Vue files
export const meta: AnnouncementMeta = {
  title: "Welcome to Mealie 🎉",
};

export default function WelcomeAnnouncement() {
  const { t } = useI18n();
  const { user } = useMealieAuth();

  return (
    <div>
      <p>
        Welcome to Mealie! If this is your first time seeing announcements, here's what to expect.
      </p>
      <div className="mb-2">
        Announcements are reserved for things like:
        <ul className="ml-6">
          <li>Important new features</li>
          <li>Major changes</li>
          <li>Anything that might require additional user actions (such as migration scripts)</li>
        </ul>
      </div>
      <p>
        While we generally keep everything in our
        {" "}
        <a className="text-primary" href="https://github.com/mealie-recipes/mealie/releases" target="_blank" rel="noreferrer">GitHub release notes</a>
        ,
        sometimes certain changes require some extra attention.
      </p>
      <p>
        Announcements are English-only; they're one-off messages from the maintainers, not a replacement for our release notes. Some elements may still be translated.
      </p>
      <hr className="mt-2 mb-4" />
      <p>
        You can opt out of announcements in your user settings:
        <br />
        <Button className="mt-2" variant="contained" color="primary" component={Link} to="/user/profile/edit">
          {t("profile.user-settings")}
        </Button>
      </p>
      {user?.canManageHousehold && (
        <p className="mt-3">
          As
          {" "}
          {user?.admin ? "an admin" : "a household manager"}
          , you can disable announcements for your entire household:
          <br />
          <Button className="mt-2" variant="contained" color="primary" component={Link} to="/household">
            {t("profile.household-settings")}
          </Button>
        </p>
      )}
      {user?.canManage && (
        <p className="mt-3">
          {user?.admin ? "You can also" : "As a group manager, you can"}
          {" "}
          disable announcements for your entire group:
          <br />
          <Button className="mt-2" variant="contained" color="primary" component={Link} to="/group">
            {t("profile.group-settings")}
          </Button>
        </p>
      )}
    </div>
  );
}
