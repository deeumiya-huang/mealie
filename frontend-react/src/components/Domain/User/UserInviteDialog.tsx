import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import { AppButtonCopy } from "~/components/global/AppButtonCopy";
import { BaseButton } from "~/components/global/BaseButton";
import { BaseDialog } from "~/components/global/BaseDialog";
import { SelectInput, TextInput } from "~/components/global/form";
import { useUserApi } from "~/hooks/api";
import { useI18n } from "~/hooks/use-global-i18n";
import { useGroups } from "~/hooks/use-groups";
import { useAdminHouseholds } from "~/hooks/use-households";
import { useMealieAuth } from "~/hooks/use-mealie-auth";
import { alert } from "~/hooks/use-toast";
import { validators } from "~/hooks/use-validators";
import type { HouseholdInDB } from "~/lib/api/types/household";
import type { GroupInDB } from "~/lib/api/types/user";
import { icons } from "~/lib/icons";

interface TargetProps {
  selectedGroup: string | null;
  onGroupChange: (id: string | null) => void;
  selectedHousehold: string | null;
  onHouseholdChange: (id: string | null) => void;
}

/** Admins pick which group and household the invite is for (the lists are admin-only endpoints). */
function AdminInviteTarget({ selectedGroup, onGroupChange, selectedHousehold, onHouseholdChange }: TargetProps) {
  const i18n = useI18n();
  const { groups } = useGroups();
  const { households } = useAdminHouseholds();
  const filteredHouseholds = selectedGroup ? (households ?? []).filter(h => h.groupId === selectedGroup) : [];

  return (
    <>
      {groups && groups.length > 0 && (
        <SelectInput<GroupInDB, string | null>
          value={selectedGroup}
          onChange={onGroupChange}
          items={groups}
          itemTitle="name"
          itemValue="id"
          variant="filled"
          label={i18n.t("group.user-group")}
          rules={[validators.required]}
        />
      )}
      {households && households.length > 0 && (
        <SelectInput<HouseholdInDB, string | null>
          value={selectedHousehold}
          onChange={onHouseholdChange}
          items={filteredHouseholds}
          itemTitle="name"
          itemValue="id"
          variant="filled"
          label={i18n.t("household.user-household")}
          rules={[validators.required]}
        />
      )}
    </>
  );
}

export interface UserInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserInviteDialog({ open, onOpenChange }: UserInviteDialogProps) {
  const i18n = useI18n();
  const auth = useMealieAuth();
  const api = useUserApi();

  const isAdmin = !!auth.user?.admin;
  const [token, setToken] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedHousehold, setSelectedHousehold] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sendTo, setSendTo] = useState("");

  async function getSignupLink(group: string | null = null, household: string | null = null) {
    const payload = (group && household) ? { uses: 1, group_id: group, household_id: household } : { uses: 1 };
    const { data } = await api.households.createInvitation(payload);
    if (data) {
      setToken(data.token);
    }
  }

  // non-admins get a link for their own household as soon as the dialog opens
  useEffect(() => {
    if (open && !isAdmin) {
      void getSignupLink();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the Vue watcher on the dialog opening
  }, [open, isAdmin]);

  function changeHousehold(id: string | null) {
    setSelectedHousehold(id);
    if (id && selectedGroup) {
      void getSignupLink(selectedGroup, id);
    }
  }

  const generatedSignupLink = token ? `${window.location.origin}/register?token=${token}` : "";

  // Email Invitation
  async function sendInvite() {
    setLoading(true);
    if (!token) {
      void getSignupLink(selectedGroup, selectedHousehold);
    }
    const { data } = await api.email.sendInvitation({
      email: sendTo,
      token,
    });

    if (data && data.success) {
      alert.success(i18n.t("profile.email-sent"));
    }
    else {
      alert.error(i18n.t("profile.error-sending-email"));
    }
    setLoading(false);
    onOpenChange(false);
  }

  const validEmail = sendTo !== "" && validators.email(sendTo) === true;

  return (
    <BaseDialog
      open={open}
      onOpenChange={onOpenChange}
      title={i18n.t("profile.get-invite-link")}
      icon={icons.accountPlusOutline}
      color="primary"
      customCardAction={(
        <BaseButton disabled={!validEmail} loading={loading} icon={icons.email} onClick={() => void sendInvite()}>
          {i18n.t("group.invite")}
        </BaseButton>
      )}
    >
      <Box sx={{ p: 2, pt: 3, display: "flex", flexDirection: "column", gap: 2 }}>
        {isAdmin && (
          <AdminInviteTarget
            selectedGroup={selectedGroup}
            onGroupChange={setSelectedGroup}
            selectedHousehold={selectedHousehold}
            onHouseholdChange={changeHousehold}
          />
        )}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <TextInput
            value={generatedSignupLink}
            label={i18n.t("profile.invite-link")}
            readOnly
            variant="filled"
            sx={{ flex: 3 }}
          />
          <Box sx={{ flex: 1 }}>
            <AppButtonCopy icon={false} color="info" copyText={generatedSignupLink} />
          </Box>
        </Box>
        <TextInput
          value={sendTo}
          onChange={setSendTo}
          label={i18n.t("user.email")}
          rules={[validators.email]}
          onKeyDown={(e) => {
            if (e.key === "Enter") void sendInvite();
          }}
        />
      </Box>
    </BaseDialog>
  );
}

export default UserInviteDialog;
