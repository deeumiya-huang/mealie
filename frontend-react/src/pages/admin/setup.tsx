import { Fragment, useState, type ReactNode } from "react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import LinearProgress from "@mui/material/LinearProgress";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Stepper from "@mui/material/Stepper";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { Link, useNavigate } from "react-router";
import { EndPageContent } from "@/components/Domain/Admin/Setup/EndPageContent";
import { GroupAIProviderSettingsEditor } from "@/components/Domain/Group/GroupAIProviderSettingsEditor";
import { UserRegistrationForm } from "@/components/Domain/User/UserRegistrationForm";
import { AppLogo } from "@/components/global/AppLogo";
import { AutoForm } from "@/components/global/AutoForm";
import { BaseButton } from "@/components/global/BaseButton";
import { LanguageDialog } from "@/components/global/LanguageDialog";
import { MdiIcon } from "@/components/global/MdiIcon";
import { useAdminApi, useUserApi } from "@/hooks/api";
import { useAIProviders } from "@/hooks/use-ai-providers";
import { authBackend } from "@/hooks/use-auth-backend";
import { useGroupSelf } from "@/hooks/use-groups";
import { useLocales } from "@/hooks/use-locales";
import { useMealieAuth } from "@/hooks/use-mealie-auth";
import { useCommonSettingsForm } from "@/hooks/use-setup/common-settings-form";
import { alert } from "@/hooks/use-toast";
import { useUserRegistrationForm } from "@/hooks/use-users/user-registration-form";
import { useDisplay, usePageTitle } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import type { AIProviderCreate, AIProviderUpdate } from "@/lib/api/types/group";
import { icons } from "@/lib/icons";
import { useColorMode } from "@/providers/color-mode";

const Pages = {
  LANDING: 1,
  USER_INFO: 2,
  PAGE_2: 3,
  AI_PROVIDERS: 4,
  CONFIRM: 5,
  END: 6,
} as const;

type Page = typeof Pages[keyof typeof Pages];

function getStepperColor(currentPage: number, page: number) {
  if (currentPage === page) {
    return "info";
  }
  if (currentPage > page) {
    return "success";
  }
  return "";
}

/** Round step icon (Vuetify `v-stepper-item` avatar): info = current, success = done, grey = upcoming. */
function StepIcon({ path, color }: { path: string; color: string }) {
  return (
    <Avatar
      sx={theme => ({
        width: "3rem",
        height: "3rem",
        color: "common.white",
        bgcolor: color ? theme.palette[color as "info" | "success"].main : theme.palette.grey[500],
      })}
    >
      <MdiIcon path={path} size={22} />
    </Avatar>
  );
}

interface StepActionsProps {
  disabled: boolean;
  /** Back button (`#prev` slot hidden on the first page). */
  onPrev?: () => void;
  next: ReactNode;
}

/** Port of `v-stepper-actions`: Back on the left, the page's primary action on the right. */
function StepActions({ disabled, onPrev, next }: StepActionsProps) {
  const { t } = useI18n();
  return (
    <CardActions sx={{ justifyContent: onPrev ? "space-between" : "flex-end", p: 2 }}>
      {onPrev && (
        <Button variant="text" disabled={disabled} onClick={onPrev}>
          {t("general.back")}
        </Button>
      )}
      {next}
    </CardActions>
  );
}

export default function AdminSetupPage() {
  // ================================================================
  // Setup
  const { t } = useI18n();
  const auth = useMealieAuth();
  const userApi = useUserApi();
  const adminApi = useAdminApi();
  const navigate = useNavigate();
  const { mdAndUp } = useDisplay();
  const { isDark } = useColorMode();

  const groupSlug = auth.user?.groupSlug;

  const { group, actions: groupActions } = useGroupSelf();
  const { createOne, updateOne, deleteOne } = useAIProviders();

  async function handleCreateProvider(data: AIProviderCreate) {
    const result = await createOne(data);
    if (result.data) {
      await groupActions.refresh();
      alert.success(t("group.ai-provider-settings.provider-created"));
    }
    else {
      alert.error(t("group.ai-provider-settings.provider-create-failed"));
    }
  }

  async function handleUpdateProvider(id: string, data: AIProviderUpdate) {
    const result = await updateOne(id, data);
    if (result.data) {
      await groupActions.refresh();
      alert.success(t("group.ai-provider-settings.provider-updated"));
    }
    else {
      alert.error(t("group.ai-provider-settings.provider-update-failed"));
    }
  }

  async function handleDeleteProvider(id: string) {
    const result = await deleteOne(id);
    if (result.data) {
      await groupActions.refresh();
      alert.success(t("group.ai-provider-settings.provider-deleted"));
    }
    else {
      alert.error(t("group.ai-provider-settings.provider-delete-failed"));
    }
  }

  const { locale } = useLocales();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [langDialog, setLangDialog] = useState(false);

  usePageTitle(t("admin.setup.first-time-setup"));

  // ================================================================
  // Forms
  const { accountDetails, credentials } = useUserRegistrationForm();
  const { commonSettingsForm } = useCommonSettingsForm();
  const [commonSettings, setCommonSettings] = useState({
    makeGroupRecipesPublic: false,
    useSeedData: true,
  });

  const confirmationData = [
    {
      display: true,
      text: t("user.email"),
      value: accountDetails.email,
    },
    {
      display: true,
      text: t("user.username"),
      value: accountDetails.username,
    },
    {
      display: true,
      text: t("user.full-name"),
      value: accountDetails.fullName,
    },
    {
      display: true,
      text: t("user.enable-advanced-content"),
      value: accountDetails.advancedOptions ? t("general.yes") : t("general.no"),
    },
    {
      display: true,
      text: t("group.enable-public-access"),
      value: commonSettings.makeGroupRecipesPublic ? t("general.yes") : t("general.no"),
    },
    {
      display: true,
      text: t("user-registration.use-seed-data"),
      value: commonSettings.useSeedData ? t("general.yes") : t("general.no"),
    },
  ];

  // ================================================================
  // Page Navigation
  const [currentPage, setCurrentPage] = useState<number>(Pages.LANDING);

  // ================================================================
  // Page Submission

  // Reads the signed-in user when called: changing the password signs in again, so the render's
  // snapshot can be out of date by the time later steps run.
  const currentUser = () => authBackend.getState().user!;

  async function updateUser() {
    const user = currentUser();
    const { response } = await userApi.users.updateOne(user.id, {
      ...user,
      email: accountDetails.email,
      username: accountDetails.username,
      fullName: accountDetails.fullName,
      advanced: accountDetails.advancedOptions,
    });

    if (!response || response.status !== 200) {
      alert.error(t("events.something-went-wrong"));
    }
    else {
      void auth.getSession();
    }
  }

  async function updatePassword() {
    // Read before updateUser can change it: the account is still identified by its current email at
    // the point we have to sign back in.
    const currentEmail = currentUser().email;
    const newPassword = credentials.password1;

    const { response } = await userApi.users.changePassword({
      currentPassword: "MyPassword",
      newPassword,
    });

    if (!response || response.status !== 200) {
      alert.error(t("events.something-went-wrong"));
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
      alert.error(t("events.something-went-wrong"));
    }
  }

  async function submitRegistration() {
    // we update the password first, then update the user's details
    await updatePassword().then(updateUser);
  }

  async function updateGroup() {
    const { data } = await userApi.groups.getOne(currentUser().groupId);
    if (!data || !data.preferences) {
      alert.error(t("events.something-went-wrong"));
      return;
    }

    const preferences = {
      ...data.preferences,
      privateGroup: !commonSettings.makeGroupRecipesPublic,
    };

    const payload = {
      ...data,
      preferences,
    };

    const { response } = await userApi.groups.updateOne(currentUser().groupId, payload);
    if (!response || response.status !== 200) {
      alert.error(t("events.something-went-wrong"));
    }
  }

  async function updateHousehold() {
    const { data } = await adminApi.households.getOne(currentUser().householdId);
    if (!data || !data.preferences) {
      alert.error(t("events.something-went-wrong"));
      return;
    }

    const preferences = {
      ...data.preferences,
      privateHousehold: !commonSettings.makeGroupRecipesPublic,
      recipePublic: commonSettings.makeGroupRecipesPublic,
    };

    const payload = {
      ...data,
      preferences,
    };

    const { response } = await adminApi.households.updateOne(currentUser().householdId, payload);
    if (!response || response.status !== 200) {
      alert.error(t("events.something-went-wrong"));
    }
  }

  async function seedFoods() {
    const { response } = await userApi.seeders.foods({ locale });
    if (!response || response.status !== 200) {
      alert.error(t("events.something-went-wrong"));
    }
  }

  async function seedUnits() {
    const { response } = await userApi.seeders.units({ locale });
    if (!response || response.status !== 200) {
      alert.error(t("events.something-went-wrong"));
    }
  }

  async function seedData() {
    if (!commonSettings.useSeedData) {
      return;
    }

    await Promise.all([seedFoods(), seedUnits()]);
  }

  async function submitCommonSettings() {
    const tasks = [
      updateGroup(),
      updateHousehold(),
      seedData(),
    ];

    await Promise.all(tasks);
  }

  async function submitAll() {
    // Not part of the parallel batch: changing the password invalidates the session and establishes a
    // new one, and any request landing in that window would 401 and bounce the admin out of setup.
    await submitRegistration();

    const tasks = [
      submitCommonSettings(),
      groupActions.updateAIProviderSettings(),
    ];

    await Promise.all(tasks);
  }

  async function handleSubmit(page: Page) {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      switch (page) {
        case Pages.USER_INFO:
          if (await accountDetails.validate()) {
            setCurrentPage(current => current + 1);
          }
          break;
        case Pages.CONFIRM:
          await submitAll();
          setCurrentPage(current => current + 1);
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

  const steps: { page: Page; icon: string; title: string }[] = [
    { page: Pages.LANDING, icon: icons.wave, title: t("general.start") },
    { page: Pages.USER_INFO, icon: icons.user, title: t("user-registration.account-details") },
    { page: Pages.PAGE_2, icon: icons.cog, title: t("settings.site-settings") },
    { page: Pages.AI_PROVIDERS, icon: icons.robot, title: t("group.ai-provider-settings.ai-providers") },
    { page: Pages.CONFIRM, icon: icons.chefHat, title: t("admin.maintenance.summary-title") },
    { page: Pages.END, icon: icons.check, title: t("admin.setup.setup-complete") },
  ];

  const nextButton = (
    <Button variant="contained" color="success" disabled={isSubmitting} loading={isSubmitting} onClick={() => void onNext()}>
      {t("general.next")}
    </Button>
  );

  return (
    <Container
      maxWidth={false}
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        minHeight: "100vh",
        bgcolor: isDark ? undefined : "#f5f8fa",
      }}
    >
      {/* Header Toolbar */}
      <Card elevation={4} sx={{ width: 1200, maxWidth: "100%", my: mdAndUp ? 5 : 0 }}>
        <Toolbar sx={{ bgcolor: "primary.main", color: "primary.contrastText", display: "flex", justifyContent: "center" }}>
          <Typography variant="h4" component="div" sx={{ textAlign: "center", mx: 0 }}>
            Mealie
          </Typography>
        </Toolbar>

        {/* Stepper Wizard */}
        <Box>
          <Stepper activeStep={currentPage - 1} alternativeLabel sx={{ p: 3 }}>
            {steps.map(step => (
              <Step key={step.page} completed={currentPage > step.page}>
                <StepLabel icon={<StepIcon path={step.icon} color={getStepperColor(currentPage, step.page)} />}>
                  {step.title}
                </StepLabel>
              </Step>
            ))}
          </Stepper>
          {isSubmitting && currentPage === Pages.CONFIRM && (
            <LinearProgress color="primary" sx={{ mb: 1 }} />
          )}

          <Box>
            {/* LANDING */}
            {currentPage === Pages.LANDING && (
              <Box>
                <Container sx={{ mb: 6 }}>
                  <AppLogo />
                  <Typography
                    variant="h5"
                    component="div"
                    sx={{ my: 2.5, textAlign: "center", display: "flex", justifyContent: "center", whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                  >
                    {t("admin.setup.welcome-to-mealie-get-started")}
                  </Typography>
                  <Typography component="p" sx={{ textAlign: "center" }}>
                    {t("admin.setup.previous-mealie-instance")}
                  </Typography>
                  <Button
                    component={Link}
                    to="/admin/backups"
                    variant="outlined"
                    color="primary"
                    sx={{ display: "flex", mx: "auto", my: 1.5, width: "fit-content", borderRadius: 9999, fontWeight: 500 }}
                  >
                    {t("settings.backup.restore-backup")}
                  </Button>
                  <Button
                    component={Link}
                    to={groupSlug ? `/g/${groupSlug}` : "/login"}
                    variant="outlined"
                    color="inherit"
                    sx={{ display: "flex", mx: "auto", width: "fit-content", borderRadius: 9999, fontWeight: 500 }}
                  >
                    {t("admin.setup.already-set-up-bring-to-homepage")}
                  </Button>
                </Container>

                <CardActions sx={{ justifyContent: "center", flexDirection: "column", py: 4 }}>
                  <BaseButton
                    color="primary"
                    icon={icons.translate}
                    sx={{ px: 5, borderRadius: 9999 }}
                    onClick={() => setLangDialog(true)}
                  >
                    {t("language-dialog.choose-language")}
                  </BaseButton>
                </CardActions>

                <StepActions disabled={isSubmitting} next={nextButton} />
              </Box>
            )}

            {/* USER INFO */}
            {currentPage === Pages.USER_INFO && (
              <Box>
                <Container maxWidth={false} sx={{ maxWidth: "880px !important" }}>
                  <UserRegistrationForm />
                </Container>
                <StepActions disabled={isSubmitting} onPrev={onPrev} next={nextButton} />
              </Box>
            )}

            {/* COMMON SETTINGS */}
            {currentPage === Pages.PAGE_2 && (
              <Box>
                <Container maxWidth={false} sx={{ maxWidth: "880px !important" }}>
                  <Typography variant="h5" component="div" sx={{ p: 0 }}>
                    {t("admin.setup.common-settings-for-new-sites")}
                  </Typography>
                  <AutoForm
                    value={commonSettings}
                    onChange={value => setCommonSettings(value as typeof commonSettings)}
                    items={commonSettingsForm}
                  />
                </Container>
                <StepActions disabled={isSubmitting} onPrev={onPrev} next={nextButton} />
              </Box>
            )}

            {/* AI PROVIDERS */}
            {currentPage === Pages.AI_PROVIDERS && (
              <Box>
                <Container maxWidth={false} sx={{ maxWidth: "880px !important" }}>
                  <Typography variant="h5" component="div" sx={{ p: 0 }}>
                    {t("group.ai-provider-settings.ai-providers")}
                  </Typography>
                  <Typography variant="body2" component="div" sx={{ px: 0, py: 1, color: "text.secondary", whiteSpace: "normal" }}>
                    {t("group.ai-provider-settings.ai-providers-description")}
                  </Typography>
                  {group?.aiProviderSettings && (
                    <Box sx={{ mt: 2 }}>
                      <GroupAIProviderSettingsEditor
                        value={group.aiProviderSettings}
                        onChange={aiProviderSettings => groupActions.set(current => (current ? { ...current, aiProviderSettings } : current))}
                        hideHeader
                        onCreate={data => void handleCreateProvider(data)}
                        onUpdate={(id, data) => void handleUpdateProvider(id, data)}
                        onDelete={id => void handleDeleteProvider(id)}
                      />
                    </Box>
                  )}
                </Container>
                <StepActions disabled={isSubmitting} onPrev={onPrev} next={nextButton} />
              </Box>
            )}

            {/* CONFIRMATION */}
            {currentPage === Pages.CONFIRM && (
              <Box>
                <Container maxWidth={false} sx={{ maxWidth: "880px !important" }}>
                  <Typography variant="h5" component="div" sx={{ p: 0 }}>
                    {t("general.confirm-how-does-everything-look")}
                  </Typography>
                  <List>
                    {confirmationData.map((item, idx) => (
                      <Fragment key={item.text}>
                        {item.display && (
                          <ListItem sx={{ px: 0 }}>
                            <ListItemText primary={item.text} secondary={item.value} />
                          </ListItem>
                        )}
                        {idx !== confirmationData.length - 1 && <Divider />}
                      </Fragment>
                    ))}
                  </List>
                </Container>
                <StepActions
                  disabled={isSubmitting}
                  onPrev={onPrev}
                  next={(
                    <BaseButton
                      create
                      disabled={isSubmitting}
                      loading={isSubmitting}
                      icon={icons.check}
                      text={t("general.submit")}
                      onClick={() => void onNext()}
                    />
                  )}
                />
              </Box>
            )}

            {/* END */}
            {currentPage === Pages.END && (
              <Box>
                <EndPageContent />
                <StepActions
                  disabled={isSubmitting}
                  onPrev={onPrev}
                  next={(
                    <BaseButton
                      color="primary"
                      disabled={isSubmitting}
                      loading={isSubmitting}
                      icon={icons.home}
                      text={t("general.home")}
                      onClick={() => void onFinish()}
                    />
                  )}
                />
              </Box>
            )}
          </Box>
        </Box>

        {/* Dialog Language */}
        <LanguageDialog open={langDialog} onOpenChange={setLangDialog} />
      </Card>
    </Container>
  );
}
