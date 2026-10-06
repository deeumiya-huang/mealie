import { useState, type FormEvent } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { useParams } from "react-router";
import { AppToolbar } from "@/components/global/AppToolbar";
import { BaseButton } from "@/components/global/BaseButton";
import { BaseImg } from "@/components/global/BaseImg";
import { BasePageTitle } from "@/components/global/BasePageTitle";
import { HouseholdPreferencesEditor } from "@/components/Domain/Household/HouseholdPreferencesEditor";
import { useAdminApi } from "@/hooks/api";
import { useGroups } from "@/hooks/use-groups";
import { alert } from "@/hooks/use-toast";
import { validators } from "@/hooks/use-validators";
import { field, useAsyncData, useFormValidation } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import type { HouseholdInDB } from "@/lib/api/types/household";

export default function AdminManageHouseholdsHouseholdPage() {
  const { t } = useI18n();
  const params = useParams();
  const { groups } = useGroups();
  const adminApi = useAdminApi();

  const householdId = params.id as string;

  const [userError, setUserError] = useState(false);

  const { data: loadedHousehold } = useAsyncData<HouseholdInDB | null>(`get-household-${householdId}`, async () => {
    if (!householdId) {
      return null;
    }
    const { data, error } = await adminApi.households.getOne(householdId);

    if (error?.response?.status === 404) {
      alert.error(t("user.user-not-found"));
      setUserError(true);
    }
    return data;
  }, [householdId]);

  // The form edits a copy of the loaded household (Vue mutated the async data in place).
  const [edited, setEdited] = useState<{ source: HouseholdInDB | null; household: HouseholdInDB } | null>(null);
  const household = edited && edited.source === loadedHousehold ? edited.household : loadedHousehold;

  function updateHousehold(change: Partial<HouseholdInDB>) {
    if (!household) return;
    setEdited({ source: loadedHousehold, household: { ...household, ...change } });
  }

  const form = useFormValidation({
    groupId: field<string>(household?.groupId ?? "", groups ? [validators.required] : []),
    name: field<string>(household?.name ?? "", [validators.required]),
  });

  async function handleSubmit() {
    if (!form.validate() || household === null) {
      return;
    }

    const { response, data } = await adminApi.households.updateOne(household.id, household);
    if (response?.status === 200 && data) {
      setEdited({ source: loadedHousehold, household: data });
      alert.success(t("settings.settings-updated"));
    }
    else {
      alert.error(t("settings.settings-update-failed"));
    }
  }

  if (!household) {
    return null;
  }

  // A select shows nothing (instead of MUI's out-of-range warning) until its options have loaded.
  const groupValue = groups?.some(group => group.id === household.groupId) ? household.groupId : "";

  return (
    <Container sx={{ maxWidth: "800px !important" }}>
      <BasePageTitle
        header={<BaseImg width="100%" maxHeight="125px" maxWidth="125px" src="/svgs/manage-group-settings.svg" />}
        title={t("household.admin-household-management")}
      />
      <AppToolbar back />
      <CardContent>{t("household.household-id-value", [household.id])}</CardContent>
      {!userError && (
        <Box
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            void handleSubmit();
          }}
        >
          <Card variant="outlined" sx={{ borderColor: "lightgrey" }}>
            <CardContent>
              {groups && (
                <TextField
                  select
                  fullWidth
                  disabled
                  variant="filled"
                  label={t("group.user-group")}
                  value={groupValue}
                  {...form.fieldProps("groupId")}
                >
                  {groups.map(group => (
                    <MenuItem key={group.id} value={group.id}>
                      {group.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
              <TextField
                fullWidth
                variant="filled"
                label={t("household.household-name")}
                value={household.name}
                {...form.fieldProps("name")}
                onChange={event => updateHousehold({ name: event.target.value })}
                sx={{ mt: 2 }}
              />
              {household.preferences && (
                <HouseholdPreferencesEditor
                  value={household.preferences}
                  onChange={preferences => updateHousehold({ preferences })}
                />
              )}
            </CardContent>
          </Card>
          <Box sx={{ display: "flex", p: 1 }}>
            <BaseButton type="button" edit sx={{ ml: "auto" }} onClick={() => void handleSubmit()}>
              {t("general.update")}
            </BaseButton>
          </Box>
        </Box>
      )}
    </Container>
  );
}
