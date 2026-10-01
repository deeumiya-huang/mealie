import { useEffect, useRef } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import { BaseButton } from "~/components/global/BaseButton";
import { BaseContainer } from "~/components/global/BaseContainer";
import { BasePageTitle, BasePageTitleImage } from "~/components/global/BasePageTitle";
import { VForm } from "~/components/global/form";
import type { FormHandle } from "~/components/global/form";
import { HouseholdPreferencesEditor } from "~/components/Domain/Household/HouseholdPreferencesEditor";
import { useI18n } from "~/hooks/use-global-i18n";
import { useHouseholdSelf } from "~/hooks/use-households";
import { useSeoMeta } from "~/hooks/use-seo-meta";
import { alert } from "~/hooks/use-toast";

export default function HouseholdSettingsPage() {
  const { household, actions: householdActions } = useHouseholdSelf();
  const i18n = useI18n();

  useSeoMeta({ title: i18n.t("household.household") });

  // useHouseholdSelf() caches data in a module-level singleton for the lifetime of the tab,
  // so revisiting this page via client-side navigation can otherwise show stale
  // preferences if they were changed elsewhere (e.g. Admin Households panel) in the
  // same session. Force a revalidation whenever this page is entered.
  useEffect(() => {
    void householdActions.refresh();
  }, [householdActions]);

  const refHouseholdEditForm = useRef<FormHandle>(null);

  async function handleSubmit() {
    if (!refHouseholdEditForm.current?.validate() || !household?.preferences) {
      return;
    }
    const data = await householdActions.updatePreferences();
    if (data) alert.success(i18n.t("settings.settings-updated"));
    else alert.error(i18n.t("settings.settings-update-failed"));
  }

  if (!household) {
    return null;
  }

  return (
    <BaseContainer sx={{ maxWidth: { md: 900 } }}>
      <Box sx={{ mb: 2.5 }}>
        <BasePageTitle
          header={<BasePageTitleImage src="/svgs/manage-group-settings.svg" maxWidth={100} maxHeight={100} />}
          title={i18n.t("profile.household-settings")}
        >
          {i18n.t("profile.household-description")}
        </BasePageTitle>
      </Box>
      <VForm
        ref={refHouseholdEditForm}
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit();
        }}
      >
        <Card variant="outlined" sx={{ borderColor: "lightgray" }}>
          <CardContent>
            {household.preferences && (
              <HouseholdPreferencesEditor
                value={household.preferences}
                onChange={preferences => householdActions.set(prev => (prev ? { ...prev, preferences } : prev))}
              />
            )}
          </CardContent>
        </Card>
        <Box sx={{ display: "flex", p: 1 }}>
          <BaseButton type="submit" edit sx={{ ml: "auto" }}>{i18n.t("general.update")}</BaseButton>
        </Box>
      </VForm>
    </BaseContainer>
  );
}
