import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import { AppToolbar } from "~/components/global/AppToolbar";
import { BaseButton } from "~/components/global/BaseButton";
import { BaseContainer } from "~/components/global/BaseContainer";
import { BasePageTitle, BasePageTitleImage } from "~/components/global/BasePageTitle";
import { SelectInput, TextInput, VForm } from "~/components/global/form";
import type { FormHandle } from "~/components/global/form";
import { HouseholdPreferencesEditor } from "~/components/Domain/Household/HouseholdPreferencesEditor";
import { useAdminApi } from "~/hooks/api";
import { useI18n } from "~/hooks/use-global-i18n";
import { useGroups } from "~/hooks/use-groups";
import { alert } from "~/hooks/use-toast";
import { validators } from "~/hooks/use-validators";
import type { HouseholdInDB } from "~/lib/api/types/household";
import type { GroupInDB } from "~/lib/api/types/user";

export default function AdminHouseholdPage() {
  const params = useParams();
  const i18n = useI18n();
  const { groups } = useGroups();
  const householdId = params.id as string;

  const refHouseholdEditForm = useRef<FormHandle>(null);
  const adminApi = useAdminApi();
  const [userError, setUserError] = useState(false);
  const [household, setHousehold] = useState<HouseholdInDB | null>(null);

  useEffect(() => {
    if (!householdId) return;
    void adminApi.households.getOne(householdId).then(({ data, error }) => {
      if ((error as { response?: { status?: number } } | null)?.response?.status === 404) {
        alert.error(i18n.t("user.user-not-found"));
        setUserError(true);
      }
      setHousehold(data);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch per household only
  }, [adminApi, householdId]);

  async function handleSubmit() {
    if (!refHouseholdEditForm.current?.validate() || household === null) {
      return;
    }

    const { response, data } = await adminApi.households.updateOne(household.id, household);
    if (response?.status === 200 && data) {
      setHousehold(data);
      alert.success(i18n.t("settings.settings-updated"));
    }
    else {
      alert.error(i18n.t("settings.settings-update-failed"));
    }
  }

  if (!household) return null;

  return (
    <BaseContainer className="narrow-container">
      <BasePageTitle
        header={<BasePageTitleImage src="/svgs/manage-group-settings.svg" maxWidth={125} maxHeight={125} />}
        title={i18n.t("household.admin-household-management")}
      />
      <AppToolbar back />
      <Box sx={{ p: 2 }}>{i18n.t("household.household-id-value", [household.id])}</Box>
      {!userError && (
        <VForm
          ref={refHouseholdEditForm}
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
        >
          <Card variant="outlined" sx={{ borderColor: "lightgrey", p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            {groups && (
              <SelectInput<GroupInDB, string>
                value={household.groupId}
                disabled
                items={groups}
                variant="solo-filled"
                itemTitle="name"
                itemValue="id"
                label={i18n.t("group.user-group")}
                rules={[validators.required]}
              />
            )}
            <TextInput
              value={household.name}
              onChange={name => setHousehold({ ...household, name })}
              variant="solo-filled"
              label={i18n.t("household.household-name")}
              rules={[validators.required]}
            />
            {household.preferences && (
              <HouseholdPreferencesEditor
                value={household.preferences}
                onChange={preferences => setHousehold({ ...household, preferences })}
              />
            )}
          </Card>
          <Box sx={{ display: "flex", p: 1 }}>
            <Box sx={{ ml: "auto" }}>
              <BaseButton type="submit" edit>{i18n.t("general.update")}</BaseButton>
            </Box>
          </Box>
        </VForm>
      )}
    </BaseContainer>
  );
}
