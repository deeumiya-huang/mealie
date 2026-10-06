import { useEffect, type FormEvent } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import { BaseButton } from "@/components/global/BaseButton";
import { BaseImg } from "@/components/global/BaseImg";
import { BasePageTitle } from "@/components/global/BasePageTitle";
import { HouseholdPreferencesEditor } from "@/components/Domain/Household/HouseholdPreferencesEditor";
import { useHouseholdSelf } from "@/hooks/use-households";
import { alert } from "@/hooks/use-toast";
import { usePageTitle } from "@/hooks/utils";
import { useI18n } from "@/i18n";

export default function HouseholdIndexPage() {
  const { t } = useI18n();
  const { household, actions: householdActions } = useHouseholdSelf();

  usePageTitle(t("household.household"));

  // useHouseholdSelf() caches data in a module-level singleton for the lifetime of the tab,
  // so revisiting this page via client-side navigation can otherwise show stale
  // preferences if they were changed elsewhere (e.g. Admin Households panel) in the
  // same session. Force a revalidation whenever this page is entered.
  useEffect(() => {
    void householdActions.refresh();
  }, [householdActions]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!household?.preferences) {
      return;
    }

    const data = await householdActions.updatePreferences(household.preferences);
    if (data) {
      alert.success(t("settings.settings-updated"));
    }
    else {
      alert.error(t("settings.settings-update-failed"));
    }
  }

  if (!household) {
    return null;
  }

  return (
    <Container sx={{ maxWidth: "800px !important" }}>
      <Box sx={{ mb: 5 }}>
        <BasePageTitle
          header={<BaseImg width="100%" maxHeight={100} maxWidth={100} src="/svgs/manage-group-settings.svg" />}
          title={t("profile.household-settings")}
        >
          {t("profile.household-description")}
        </BasePageTitle>
      </Box>
      <form onSubmit={event => void handleSubmit(event)}>
        <Card variant="outlined" sx={{ borderColor: "lightgray" }}>
          <CardContent>
            {household.preferences && (
              <HouseholdPreferencesEditor
                value={household.preferences}
                onChange={preferences => householdActions.set(current => (current ? { ...current, preferences } : current))}
              />
            )}
          </CardContent>
        </Card>
        <Box sx={{ display: "flex", p: 1 }}>
          <BaseButton type="submit" edit sx={{ ml: "auto" }}>
            {t("general.update")}
          </BaseButton>
        </Box>
      </form>
    </Container>
  );
}
