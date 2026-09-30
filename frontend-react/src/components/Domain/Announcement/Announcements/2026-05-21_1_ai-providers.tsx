import { useMealieAuth } from "~/hooks/use-mealie-auth";
import { useI18n } from "~/hooks/use-global-i18n";
import { useGroupSelf } from "~/hooks/use-groups";
import type { AnnouncementMeta } from "~/hooks/use-announcements";
import { AnnouncementBody, AnnouncementLink } from "./_shared";

export const meta: AnnouncementMeta = {
  title: "Improved AI Provider Configuration",
};

export default function Announcement() {
  const { user } = useMealieAuth();
  const { group } = useGroupSelf();
  const i18n = useI18n();
  const aiEnabled = group?.aiProviderSettings?.aiEnabled;
  return (
    <AnnouncementBody>
      <p>AI providers can now be configured directly in Mealie, without managing environment variables or secrets.</p>
      <div style={{ marginBottom: 8 }}>
        AI providers enable features such as:
        <ul>
          <li>Creating recipes from images</li>
          <li>Importing recipes from videos (YouTube, TikTok, etc.)</li>
          <li>Enhanced ingredient parsing</li>
          <li>And more!</li>
        </ul>
      </div>
      <hr />
      <p>
        {aiEnabled
          ? <span>Your group already has AI providers configured. </span>
          : <span>Your group does not currently have any AI providers configured. </span>}
        {user?.canManage
          ? (
              <span>
                You can manage them here:
                <br />
                <AnnouncementLink to="/group">{i18n.t("profile.group-settings")}</AnnouncementLink>
              </span>
            )
          : !aiEnabled && <span>Contact a group manager or server admin to set up AI providers for your group.</span>}
      </p>
      {user?.admin && (
        <div>
          <br />
          <p>
            As an admin, you can configure AI providers for any group. Unlike the old environment variable approach, providers are configured per-group:
            <br />
            <AnnouncementLink to="/admin/manage/groups">{i18n.t("group.admin-group-management")}</AnnouncementLink>
          </p>
        </div>
      )}
    </AnnouncementBody>
  );
}
