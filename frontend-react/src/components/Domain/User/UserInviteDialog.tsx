// Usage: <UserInviteDialog open={open} onOpenChange={setOpen} /> — creates a signup link (admins pick the group and
// household first) and can email it. Vue `v-model` → `open` + `onOpenChange`.
import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { AppButtonCopy } from "@/components/global/AppButtonCopy";
import { BaseButton } from "@/components/global/BaseButton";
import { BaseDialog } from "@/components/global/BaseDialog";
import { useUserApi } from "@/hooks/api";
import { useGroups } from "@/hooks/use-groups";
import { useAdminHouseholds } from "@/hooks/use-households";
import { useMealieAuth } from "@/hooks/use-mealie-auth";
import { alert } from "@/hooks/use-toast";
import { validators } from "@/hooks/use-validators";
import { field, useFormValidation } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import { icons } from "@/lib/icons";

interface UserInviteDialogProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface GroupHouseholdSelectsProps {
  selectedGroup: string | null;
  selectedHousehold: string | null;
  onGroupChange: (id: string | null) => void;
  onHouseholdChange: (id: string | null) => void;
}

// Only admins choose the group/household the invite is for; the lists are loaded when this is rendered.
function GroupHouseholdSelects({ selectedGroup, selectedHousehold, onGroupChange, onHouseholdChange }: GroupHouseholdSelectsProps) {
  const { t } = useI18n();
  const { groups } = useGroups();
  const { households, householdsInGroup } = useAdminHouseholds();

  const form = useFormValidation({
    group: field<string | null>(selectedGroup, [validators.required]),
    household: field<string | null>(selectedHousehold, [validators.required]),
  });

  const filteredHouseholds = householdsInGroup(selectedGroup);

  return (
    <>
      {groups && groups.length > 0 && (
        <TextField
          select
          fullWidth
          variant="filled"
          label={t("group.user-group")}
          value={selectedGroup ?? ""}
          margin="normal"
          {...form.fieldProps("group")}
          onChange={(event) => {
            form.touch("group");
            onGroupChange(event.target.value || null);
          }}
        >
          {groups.map(group => (
            <MenuItem key={group.id} value={group.id}>
              {group.name}
            </MenuItem>
          ))}
        </TextField>
      )}
      {households && households.length > 0 && (
        <TextField
          select
          fullWidth
          variant="filled"
          label={t("household.user-household")}
          value={selectedHousehold ?? ""}
          margin="normal"
          {...form.fieldProps("household")}
          onChange={(event) => {
            form.touch("household");
            onHouseholdChange(event.target.value || null);
          }}
        >
          {filteredHouseholds.map(household => (
            <MenuItem key={household.id} value={household.id}>
              {household.name}
            </MenuItem>
          ))}
        </TextField>
      )}
    </>
  );
}

function constructLink(tokenVal: string) {
  return tokenVal ? `${window.location.origin}/register?token=${tokenVal}` : "";
}

export function UserInviteDialog({ open, onOpenChange }: UserInviteDialogProps) {
  const { t } = useI18n();
  const auth = useMealieAuth();
  const api = useUserApi();

  const isAdmin = !!auth.user?.admin;
  const [token, setToken] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedHousehold, setSelectedHousehold] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sendTo, setSendTo] = useState("");

  const emailForm = useFormValidation({
    email: field(sendTo, [validators.email]),
  });

  async function getSignupLink(group: string | null = null, household: string | null = null) {
    const payload = (group && household) ? { uses: 1, group_id: group, household_id: household } : { uses: 1 };
    const { data } = await api.households.createInvitation(payload);
    if (data) {
      setToken(data.token);
      return data.token;
    }
    return "";
  }

  // A non-admin's link is created whenever the dialog opens (Vue: watch(inviteDialog))
  useEffect(() => {
    if (open && !isAdmin) {
      void (async () => {
        const { data } = await api.households.createInvitation({ uses: 1 });
        if (data) {
          setToken(data.token);
        }
      })();
    }
  }, [open, isAdmin, api]);

  function changeHousehold(id: string | null) {
    setSelectedHousehold(id);
    if (id && selectedGroup) {
      void getSignupLink(selectedGroup, id);
    }
  }

  const generatedSignupLink = constructLink(token);

  async function sendInvite() {
    setLoading(true);
    const inviteToken = token || await getSignupLink(selectedGroup, selectedHousehold);
    const { data } = await api.email.sendInvitation({
      email: sendTo,
      token: inviteToken,
    });

    if (data && data.success) {
      alert.success(t("profile.email-sent"));
    }
    else {
      alert.error(t("profile.error-sending-email"));
    }
    setLoading(false);
    onOpenChange?.(false);
  }

  const validEmail = sendTo !== "" && validators.email(sendTo) === true;

  return (
    <BaseDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("profile.get-invite-link")}
      icon={icons.accountPlusOutline}
      color="primary"
      customCardAction={(
        <BaseButton disabled={!validEmail} loading={loading} icon={icons.email} onClick={() => void sendInvite()}>
          {t("group.invite")}
        </BaseButton>
      )}
    >
      <Container>
        <Box component="form" noValidate sx={{ mt: 2.5 }} onSubmit={event => event.preventDefault()}>
          {isAdmin && (
            <GroupHouseholdSelects
              selectedGroup={selectedGroup}
              selectedHousehold={selectedHousehold}
              onGroupChange={setSelectedGroup}
              onHouseholdChange={changeHousehold}
            />
          )}
          <Grid container spacing={1} sx={{ alignItems: "center" }}>
            <Grid size={9}>
              <TextField
                fullWidth
                variant="filled"
                margin="normal"
                type="text"
                label={t("profile.invite-link")}
                value={generatedSignupLink}
                slotProps={{ input: { readOnly: true } }}
              />
            </Grid>
            <Grid size={3} sx={{ pl: 0.5, mt: 1.5 }}>
              <AppButtonCopy icon={false} color="info" copyText={generatedSignupLink} />
            </Grid>
          </Grid>
          <TextField
            fullWidth
            variant="outlined"
            margin="normal"
            label={t("user.email")}
            value={sendTo}
            {...emailForm.fieldProps("email")}
            onChange={event => setSendTo(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void sendInvite();
              }
            }}
          />
        </Box>
      </Container>
    </BaseDialog>
  );
}
