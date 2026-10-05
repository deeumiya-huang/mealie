import { useEffect } from "react";
import { useNavigate } from "react-router";
import useDefaultActivity from "@/hooks/use-default-activity";
import { useMealieAuth } from "@/hooks/use-mealie-auth";
import { useUserActivityPreferences } from "@/hooks/use-users/preferences";
import type { AppInfo, AppStartupInfo } from "@/lib/api/types/admin";
import { http } from "@/lib/http";

/** "/": sends the user to their default activity (or first-login setup); public visitors to the default group. */
export default function IndexPage() {
  const auth = useMealieAuth();
  const navigate = useNavigate();
  const [activityPreferences] = useUserActivityPreferences();
  const { getDefaultActivityRoute } = useDefaultActivity();
  const groupSlug = auth.user?.groupSlug;
  const isAdmin = auth.user?.admin;
  const defaultActivity = activityPreferences.defaultActivity;

  useEffect(() => {
    let active = true;

    async function redirectPublicUserToDefaultGroup() {
      const { data } = await http.get<AppInfo>("/api/app/about");
      if (!active) {
        return;
      }
      if (data?.defaultGroupSlug) {
        void navigate(`/g/${data.defaultGroupSlug}`);
      }
      else {
        void navigate("/login");
      }
    }

    async function redirect() {
      if (groupSlug) {
        const data = await http.get<AppStartupInfo>("/api/app/about/startup-info");
        if (!active) {
          return;
        }
        const isDemo = data.data.isDemo;
        const isFirstLogin = data.data.isFirstLogin;
        const defaultActivityRoute = getDefaultActivityRoute(defaultActivity, groupSlug);
        if (!isDemo && isFirstLogin && isAdmin) {
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

    void redirect();
    return () => {
      active = false;
    };
  }, [groupSlug, isAdmin, defaultActivity, getDefaultActivityRoute, navigate]);

  return <div />;
}
