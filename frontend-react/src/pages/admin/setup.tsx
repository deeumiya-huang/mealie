import { useState } from "react";
import type { ReactNode } from "react";
import { Link as RouterLink, useNavigate } from "react-router";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Divider from "@mui/material/Divider";
import LinearProgress from "@mui/material/LinearProgress";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Stepper from "@mui/material/Stepper";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import { AppLogo } from "~/components/global/AppLogo";
import { AutoForm } from "~/components/global/AutoForm";
import { BaseButton } from "~/components/global/BaseButton";
import { Icon } from "~/components/global/Icon";
import { LanguageDialog } from "~/components/global/LanguageDialog";
import { EndPageContent } from "~/components/Domain/Admin/Setup/EndPageContent";
import { GroupAIProviderSettingsEditor } from "~/components/Domain/Group/GroupAIProviderSettingsEditor";
import { UserRegistrationForm } from "~/components/Domain/User/UserRegistrationForm";
import { useAdminApi, useUserApi } from "~/hooks/api";
import { useAIProviders } from "~/hooks/use-ai-providers";
import { useDisplay } from "~/hooks/use-display";
import { useI18n } from "~/hooks/use-global-i18n";
import { useGroupSelf } from "~/hooks/use-groups";
import { useLocales } from "~/hooks/use-locales";
import { useMealieAuth } from "~/hooks/use-mealie-auth";
import { useSeoMeta } from "~/hooks/use-seo-meta";
import { useCommonSettingsForm } from "~/hooks/use-setup/common-settings-form";
import { alert } from "~/hooks/use-toast";
import { useUserRegistrationForm } from "~/hooks/use-users/user-registration-form";
import type { AIProviderCreate, AIProviderUpdate } from "~/lib/api/types/group";
import { icons } from "~/lib/icons";

enum Pages {
  LANDING = 1,
  USER_INFO = 2,
  PAGE_2 = 3,
  AI_PROVIDERS = 4,
  CONFIRM = 5,
  END = 6,
}

function getStepperColor(currentPage: Pages, page: Pages): "info" | "success" | undefined {
  if (currentPage === page) {
    return "info";
  }
  if (currentPage > page) {
    return "success";
  }
  return undefined;
}

/** A wizard step's body plus its back / next row (v-stepper-window-item + v-stepper-actions). */
function StepWindow({ children, prev, next }: { children: ReactNode; prev?: ReactNode; next: ReactNode }) {
  return (
    <div>
      {children}
      <Box sx={{ display: "flex", justifyContent: "space-between", p: 2 }}>
        <div>{prev}</div>
        {next}
      </Box>
    </div>
  );
}

export default function AdminSetupPage() {
  // ================================================================
  // Setup

  const i18n = useI18n();
  const theme = useTheme();
  const { mdAndUp, smAndDown } = useDisplay();
  const auth = useMealieAuth();
  const userApi = useUserApi();
  const adminApi = useAdminApi();
  const navigate = useNavigate();
  const groupSlug = auth.user?.groupSlug;
  const { group, actions: groupActions } = useGroupSelf();
  const { createOne, updateOne, deleteOne } = useAIProviders();

  async function handleCreateProvider(data: AIProviderCreate) {
    const result = await createOne(data);
    if (result.data) {
      await groupActions.refresh();
      alert.success(i18n.t("group.ai-provider-settings.provider-created"));
    }
    else {
      alert.error(i18n.t("group.ai-provider-settings.provider-create-failed"));
    }
  }

  async function handleUpdateProvider(id: string, data: AIProviderUpdate) {
    const result = await updateOne(id, data);
    if (result.data) {
      await groupActions.refresh();
      alert.success(i18n.t("group.ai-provider-settings.provider-updated"));
    }
    else {
      alert.error(i18n.t("group.ai-provider-settings.provider-update-failed"));
    }
  }

  async function handleDeleteProvider(id: string) {
    const result = await deleteOne(id);
    if (result.data) {
      await groupActions.refresh();
      alert.success(i18n.t("group.ai-provider-settings.provider-deleted"));
    }
    else {
      alert.error(i18n.t("group.ai-provider-settings.provider-delete-failed"));
    }
  }

  const { locale } = useLocales();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [langDialog, setLangDialog] = useState(false);

  useSeoMeta({ title: i18n.t("admin.setup.first-time-setup") });

  // ================================================================
  // Forms

  const { accountDetails, credentials } = useUserRegistrationForm();
  const { commonSettingsForm } = useCommonSettingsForm();

  const [commonSettings, setCommonSettings] = useState({
    makeGroupRecipesPublic: false,
    useSeedData: true,
  });

  const confirmationData = [
    { display: true, text: i18n.t("user.email"), value: accountDetails.email },
    { display: true, text: i18n.t("user.username"), value: accountDetails.username },
    { display: true, text: i18n.t("user.full-name"), value: accountDetails.fullName },
    {
      display: true,
      text: i18n.t("user.enable-advanced-content"),
      value: accountDetails.advancedOptions ? i18n.t("general.yes") : i18n.t("general.no"),
    },
    {
      display: true,
      text: i18n.t("group.enable-public-access"),
      value: commonSettings.makeGroupRecipesPublic ? i18n.t("general.yes") : i18n.t("general.no"),
    },
    {
      display: true,
      text: i18n.t("user-registration.use-seed-data"),
      value: commonSettings.useSeedData ? i18n.t("general.yes") : i18n.t("general.no"),
    },
  ];

  // ================================================================
  // Page Navigation

  const [currentPage, setCurrentPage] = useState(Pages.LANDING);

  // ================================================================
  // Page Submission

  async function updateUser() {
    const user = auth.user!;
    const { response } = await userApi.users.updateOne(user.id, {
      ...user,
      email: accountDetails.email,
      username: accountDetails.username,
      fullName: accountDetails.fullName,
      advanced: accountDetails.advancedOptions,
    });

    if (!response || response.status !== 200) {
      alert.error(i18n.t("events.something-went-wrong"));
    }
    else {
      void auth.getSession();
    }
  }

  async function updatePassword() {
    // Read before updateUser can change it: the account is still identified by its current email at
    // the point we have to sign back in.
    const currentEmail = auth.user!.email;
    const newPassword = credentials.password1;

    const { response } = await userApi.users.changePassword({
      currentPassword: "MyPassword",
      newPassword,
    });

    if (!response || response.status !== 200) {
      alert.error(i18n.t("events.something-went-wrong"));
      return;
    }

    // Changing the password invalidates this session, and setup has several authenticated steps left,
    // so sign straight back in rather than letting the rest of the wizard 401.
    const formData = new FormData();
    formData.append("username", currentEmail);
    formData.append("password", newPassword);
    formData.append("remember_me", "true");
    try {
      await auth.signIn(formData);
    }
    catch {
      alert.error(i18n.t("events.something-went-wrong"));
    }
  }

  async function submitRegistration() {
    // we update the password first, then update the user's details
    await updatePassword().then(updateUser);
  }

  async function updateGroup() {
    const groupId = auth.user!.groupId;
    const { data } = await userApi.groups.getOne(groupId);
    if (!data || !data.preferences) {
      alert.error(i18n.t("events.something-went-wrong"));
      return;
    }

    const preferences = {
      ...data.preferences,
      privateGroup: !commonSettings.makeGroupRecipesPublic,
    };

    const { response } = await userApi.groups.updateOne(groupId, { ...data, preferences });

    if (!response || response.status !== 200) {
      alert.error(i18n.t("events.something-went-wrong"));
    }
  }

  async function updateHousehold() {
    const householdId = auth.user!.householdId;
    const { data } = await adminApi.households.getOne(householdId);
    if (!data || !data.preferences) {
      alert.error(i18n.t("events.something-went-wrong"));
      return;
    }

    const preferences = {
      ...data.preferences,
      privateHousehold: !commonSettings.makeGroupRecipesPublic,
      recipePublic: commonSettings.makeGroupRecipesPublic,
    };

    const { response } = await adminApi.households.updateOne(householdId, { ...data, preferences });

    if (!response || response.status !== 200) {
      alert.error(i18n.t("events.something-went-wrong"));
    }
  }

  async function seedFoods() {
    const { response } = await userApi.seeders.foods({ locale });
    if (!response || response.status !== 200) {
      alert.error(i18n.t("events.something-went-wrong"));
    }
  }

  async function seedUnits() {
    const { response } = await userApi.seeders.units({ locale });
    if (!response || response.status !== 200) {
      alert.error(i18n.t("events.something-went-wrong"));
    }
  }

  async function seedData() {
    if (!commonSettings.useSeedData) {
      return;
    }

    await Promise.all([seedFoods(), seedUnits()]);
  }

  async function submitCommonSettings() {
    await Promise.all([updateGroup(), updateHousehold(), seedData()]);
  }

  async function submitAll() {
    // Not part of the parallel batch: changing the password invalidates the session and establishes a
    // new one, and any request landing in that window would 401 and bounce the admin out of setup.
    await submitRegistration();

    await Promise.all([submitCommonSettings(), groupActions.updateAIProviderSettings()]);
  }

  async function handleSubmit(page: number) {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      switch (page) {
        case Pages.USER_INFO:
          if (await accountDetails.validate()) {
            setCurrentPage(p => p + 1);
          }
          break;
        case Pages.CONFIRM:
          await submitAll();
          setCurrentPage(p => p + 1);
          break;
        case Pages.END:
          void navigate(groupSlug ? `/g/${groupSlug}` : "/login");
          break;
      }
    }
    finally {
      setIsSubmitting(false);
    }
  }

  // ================================================================
  // Stepper Navigation Handlers

  function onPrev() {
    if (isSubmitting) return;
    if (currentPage > Pages.LANDING) setCurrentPage(currentPage - 1);
  }

  async function onNext() {
    if (isSubmitting) return;

    if (currentPage === Pages.USER_INFO) {
      await handleSubmit(Pages.USER_INFO);
      return;
    }

    if (currentPage === Pages.CONFIRM) {
      await handleSubmit(Pages.CONFIRM);
      return;
    }

    setCurrentPage(currentPage + 1);
  }

  async function onFinish() {
    if (isSubmitting) return;
    await handleSubmit(Pages.END);
  }

  const steps = [
    { page: Pages.LANDING, icon: icons.wave, title: i18n.t("general.start") },
    { page: Pages.USER_INFO, icon: icons.user, title: i18n.t("user-registration.account-details") },
    { page: Pages.PAGE_2, icon: icons.cog, title: i18n.t("settings.site-settings") },
    { page: Pages.AI_PROVIDERS, icon: icons.robot, title: i18n.t("group.ai-provider-settings.ai-providers") },
    { page: Pages.CONFIRM, icon: icons.chefHat, title: i18n.t("admin.maintenance.summary-title") },
    { page: Pages.END, icon: icons.check, title: i18n.t("admin.setup.setup-complete") },
  ];

  const prevButton = (
    <Button disabled={isSubmitting} onClick={onPrev}>
      {i18n.t("general.back")}
    </Button>
  );
  const nextButton = (
    <Button variant="contained" color="success" disableElevation disabled={isSubmitting} loading={isSubmitting} onClick={() => void onNext()}>
      {i18n.t("general.next")}
    </Button>
  );

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        minHeight: "100vh",
        p: { xs: 0, sm: 2 },
        bgcolor: theme.palette.mode === "dark" ? undefined : "#f5f8fa",
      }}
    >
      <Card elevation={4} sx={{ width: 1200, maxWidth: "100%", my: mdAndUp ? 5 : 0 }}>
        {/* Header Toolbar */}
        <Box sx={{ bgcolor: "primary.main", color: "primary.contrastText", py: 1.5, textAlign: "center" }}>
          <Typography variant="h4" component="div">Mealie</Typography>
        </Box>

        {/* Stepper Wizard */}
        <Stepper activeStep={currentPage - 1} alternativeLabel={!smAndDown} orientation="horizontal" sx={{ py: 3, px: 1 }}>
          {steps.map(step => (
            <Step key={step.page} completed={currentPage > step.page}>
              <StepLabel
                slots={{
                  stepIcon: () => {
                    const color = getStepperColor(currentPage, step.page);
                    return (
                      <Avatar sx={{ width: 48, height: 48, bgcolor: color ? `${color}.main` : "action.disabled" }}>
                        <Icon path={currentPage > step.page ? icons.check : step.icon} sx={{ fontSize: "1.4rem" }} />
                      </Avatar>
                    );
                  },
                }}
              >
                {smAndDown ? null : step.title}
              </StepLabel>
            </Step>
          ))}
        </Stepper>
        {isSubmitting && currentPage === Pages.CONFIRM && <LinearProgress color="primary" sx={{ mb: 1 }} />}

        {/* LANDING */}
        {currentPage === Pages.LANDING && (
          <StepWindow next={nextButton}>
            <Box sx={{ mb: 6, p: 2 }}>
              <AppLogo />
              <Typography variant="h5" sx={{ my: 2.5, textAlign: "center", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {i18n.t("admin.setup.welcome-to-mealie-get-started")}
              </Typography>
              <Typography variant="body1" sx={{ textAlign: "center" }}>
                {i18n.t("admin.setup.previous-mealie-instance")}
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5, my: 1.5 }}>
                <Button component={RouterLink} to="/admin/backups" variant="outlined" color="primary" sx={{ borderRadius: 6 }}>
                  {i18n.t("settings.backup.restore-backup")}
                </Button>
                <Button component={RouterLink} to={groupSlug ? `/g/${groupSlug}` : "/login"} variant="outlined" color="inherit" sx={{ borderRadius: 6, color: "text.secondary" }}>
                  {i18n.t("admin.setup.already-set-up-bring-to-homepage")}
                </Button>
              </Box>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <BaseButton color="primary" sx={{ px: 5, borderRadius: 6 }} icon={icons.translate} onClick={() => setLangDialog(true)}>
                {i18n.t("language-dialog.choose-language")}
              </BaseButton>
            </Box>
          </StepWindow>
        )}

        {/* USER INFO: kept mounted (Vuetify `eager`) so the registration form stays registered */}
        <Box sx={{ display: currentPage === Pages.USER_INFO ? "block" : "none" }}>
          <StepWindow prev={prevButton} next={nextButton}>
            <Box sx={{ maxWidth: 880, mx: "auto", p: 2 }}>
              <UserRegistrationForm />
            </Box>
          </StepWindow>
        </Box>

        {/* COMMON SETTINGS */}
        {currentPage === Pages.PAGE_2 && (
          <StepWindow prev={prevButton} next={nextButton}>
            <Box sx={{ maxWidth: 880, mx: "auto", p: 2 }}>
              <Typography variant="h5">{i18n.t("admin.setup.common-settings-for-new-sites")}</Typography>
              <AutoForm value={commonSettings} onChange={setCommonSettings} items={commonSettingsForm} />
            </Box>
          </StepWindow>
        )}

        {/* AI PROVIDERS */}
        {currentPage === Pages.AI_PROVIDERS && (
          <StepWindow prev={prevButton} next={nextButton}>
            <Box sx={{ maxWidth: 880, mx: "auto", p: 2 }}>
              <Typography variant="h5">{i18n.t("group.ai-provider-settings.ai-providers")}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                {i18n.t("group.ai-provider-settings.ai-providers-description")}
              </Typography>
              {group?.aiProviderSettings && (
                <Box sx={{ mt: 2 }}>
                  <GroupAIProviderSettingsEditor
                    value={group.aiProviderSettings}
                    onChange={aiProviderSettings => groupActions.set(prev => (prev ? { ...prev, aiProviderSettings } : prev))}
                    hideHeader
                    onCreate={data => void handleCreateProvider(data)}
                    onUpdate={(id, data) => void handleUpdateProvider(id, data)}
                    onDelete={id => void handleDeleteProvider(id)}
                  />
                </Box>
              )}
            </Box>
          </StepWindow>
        )}

        {/* CONFIRMATION */}
        {currentPage === Pages.CONFIRM && (
          <StepWindow
            prev={prevButton}
            next={(
              <BaseButton create disabled={isSubmitting} loading={isSubmitting} icon={icons.check} text={i18n.t("general.submit")} onClick={() => void onNext()} />
            )}
          >
            <Box sx={{ maxWidth: 880, mx: "auto", p: 2 }}>
              <Typography variant="h5">{i18n.t("general.confirm-how-does-everything-look")}</Typography>
              <List>
                {confirmationData.map((item, idx) => (
                  <Box key={idx}>
                    {item.display && (
                      <ListItem sx={{ px: 0 }}>
                        <ListItemText primary={item.text} secondary={item.value} />
                      </ListItem>
                    )}
                    {idx !== confirmationData.length - 1 && <Divider />}
                  </Box>
                ))}
              </List>
            </Box>
          </StepWindow>
        )}

        {/* END */}
        {currentPage === Pages.END && (
          <StepWindow
            prev={prevButton}
            next={(
              <BaseButton color="primary" disabled={isSubmitting} loading={isSubmitting} icon={icons.home} text={i18n.t("general.home")} onClick={() => void onFinish()} />
            )}
          >
            <EndPageContent />
          </StepWindow>
        )}

        {/* Dialog Language */}
        <LanguageDialog open={langDialog} onOpenChange={setLangDialog} />
      </Card>
    </Box>
  );
}
