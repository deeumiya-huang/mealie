import { useEffect } from "react";
import { useNavigate } from "react-router";
import type { AppInfo, AppStartupInfo } from "~/lib/api/types/admin";
import { apiHttp } from "~/app/services";
import useDefaultActivity from "~/hooks/use-default-activity";
import { useMealieAuth } from "~/hooks/use-mealie-auth";
import { useUserActivityPreferences } from "~/hooks/use-users/preferences";

/** Landing route: sends users to their default activity, first-login admins to setup. */
export default function IndexPage() {
  const auth = useMealieAuth();
  const navigate = useNavigate();
  const [activityPreferences] = useUserActivityPreferences();
  const { getDefaultActivityRoute } = useDefaultActivity();
  const groupSlug = auth.user?.groupSlug;

  useEffect(() => {
    async function redirectPublicUserToDefaultGroup() {
      const { data } = await apiHttp().get<AppInfo>("/api/app/about");
      if (data?.defaultGroupSlug) {
        void navigate(`/g/${data.defaultGroupSlug}`);
      }
      else {
        void navigate("/login");
      }
    }

    async function run() {
      if (groupSlug) {
        const { data } = await apiHttp().get<AppStartupInfo>("/api/app/about/startup-info");
        const defaultActivityRoute = getDefaultActivityRoute(activityPreferences.defaultActivity, groupSlug);
        if (!data.isDemo && data.isFirstLogin && auth.user?.admin) {
          void navigate("/admin/setup");
        }
        else if (defaultActivityRoute) {
          void navigate(defaultActivityRoute);
        }
        else {
          void navigate(`/g/${groupSlug}`);
        }
      }
      else {
        await redirectPublicUserToDefaultGroup();
      }
    }
    void run();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once on mount
  }, []);

  return <div />;
}
