import Button from "@mui/material/Button";
import { Link } from "react-router";
import type { AnnouncementMeta } from "@/hooks/use-announcements";
import { useGroupSelf } from "@/hooks/use-groups";
import { useMealieAuth } from "@/hooks/use-mealie-auth";
import { useI18n } from "@/i18n";

// eslint-disable-next-line react-refresh/only-export-components -- metadata sits next to the component, as in the Vue files
export const meta: AnnouncementMeta = {
  title: "Improved AI Provider Configuration",
};

export default function AiProvidersAnnouncement() {
  const { t } = useI18n();
  const { user } = useMealieAuth();
  const { group } = useGroupSelf();

  return (
    <div>
      <p>AI providers can now be configured directly in Mealie, without managing environment variables or secrets.</p>
      <div className="mb-2">
        AI providers enable features such as:
        <ul className="ml-6">
          <li>Creating recipes from images</li>
          <li>Importing recipes from videos (YouTube, TikTok, etc.)</li>
          <li>Enhanced ingredient parsing</li>
          <li>And more!</li>
        </ul>
      </div>
      <hr className="mt-2 mb-4" />
      <p>
        {group?.aiProviderSettings?.aiEnabled
          ? <span>Your group already has AI providers configured.</span>
          : <span>Your group does not currently have any AI providers configured.</span>}
        {" "}
        {user?.canManage
          ? (
              <span>
                You can manage them here:
                <br />
                <Button className="mt-2" variant="contained" color="primary" component={Link} to="/group">
                  {t("profile.group-settings")}
                </Button>
              </span>
            )
          : !group?.aiProviderSettings?.aiEnabled && (
              <span>Contact a group manager or server admin to set up AI providers for your group.</span>
            )}
      </p>
      {user?.admin && (
        <div>
          <br />
          <p>
            As an admin, you can configure AI providers for any group. Unlike the old environment variable approach, providers are configured per-group:
            <br />
            <Button className="mt-2" variant="contained" color="primary" component={Link} to="/admin/manage/groups">
              {t("group.admin-group-management")}
            </Button>
          </p>
        </div>
      )}
    </div>
  );
}
