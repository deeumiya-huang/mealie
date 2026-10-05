import { Fragment, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Checkbox from "@mui/material/Checkbox";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import TextField from "@mui/material/TextField";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { Link } from "react-router";
import { States } from "./states";
import { useRegisterPage } from "./use-register-page";
import { UserRegistrationForm } from "@/components/Domain/User/UserRegistrationForm";
import { AppLogo } from "@/components/global/AppLogo";
import { BaseButton } from "@/components/global/BaseButton";
import { LanguageDialog } from "@/components/global/LanguageDialog";
import { MdiIcon } from "@/components/global/MdiIcon";
import { validators } from "@/hooks/use-validators";
import { field, useFormValidation } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import { icons } from "@/lib/icons";
import { useColorMode } from "@/providers/color-mode";

function StepTitle({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <Typography variant="h6" component="div" sx={{ display: "flex", alignItems: "center", px: 2, py: 2 }}>
      <MdiIcon path={icon} size="large" sx={{ mr: 1.5 }} />
      <span>{children}</span>
    </Typography>
  );
}

export default function RegisterPage() {
  const { t } = useI18n();
  const { isDark } = useColorMode();
  const page = useRegisterPage();
  const { state, initial, provideToken, groupDetails } = page;

  const tokenForm = useFormValidation({ token: field(page.token ?? "", [validators.required]) });
  const groupForm = useFormValidation({ groupName: field(groupDetails.groupName, [validators.required]) });

  const backButton = (
    <BaseButton cancel icon={icons.back} onClick={state.back}>
      {t("general.back")}
    </BaseButton>
  );

  return (
    <Container
      maxWidth={false}
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        py: 2,
        bgcolor: isDark ? undefined : "#f5f8fa",
      }}
    >
      <Card sx={{ display: "flex", flexDirection: "column", width: "100%", maxWidth: "1200px", minHeight: "700px" }}>
        <div>
          <Toolbar sx={{ bgcolor: "primary.main", color: "primary.contrastText", width: "100%", mb: "4rem", justifyContent: "center" }}>
            <Typography variant="h4" component="div" sx={{ textAlign: "center" }}>
              Mealie
            </Typography>
          </Toolbar>
          <AppLogo />
        </div>

        {/* Form Container */}
        <Box sx={{ display: "flex", justifyContent: "center", flexGrow: 1, alignItems: "center", my: 2 }}>
          {state.ctx.state === States.Initial && (
            <Container>
              <Typography variant="h5" component="div" sx={{ my: 2, mb: 2.5, pb: 0, textAlign: "center" }}>
                {t("user-registration.user-registration")}
              </Typography>

              <Box sx={{ display: "flex", flexWrap: { xs: "wrap", md: "nowrap" }, justifyContent: "center", p: 2, gap: "1em" }}>
                <Card sx={{ width: "320px", bgcolor: "primary.main", color: "primary.contrastText" }}>
                  <CardActionArea onClick={initial.joinGroup}>
                    <Typography variant="h6" component="div" sx={{ display: "flex", alignItems: "center", justifyContent: "center", py: 1.5 }}>
                      <MdiIcon path={icons.group} size="large" sx={{ mr: 1 }} />
                      {t("user-registration.join-a-group")}
                    </Typography>
                  </CardActionArea>
                </Card>
                <Card sx={{ width: "320px", bgcolor: "primary.main", color: "primary.contrastText" }}>
                  <CardActionArea onClick={initial.createGroup}>
                    <Typography variant="h6" component="div" sx={{ display: "flex", alignItems: "center", justifyContent: "center", py: 1.5 }}>
                      <MdiIcon path={icons.user} size="large" sx={{ mr: 1 }} />
                      {t("user-registration.create-a-new-group")}
                    </Typography>
                  </CardActionArea>
                </Card>
              </Box>
            </Container>
          )}

          {state.ctx.state === States.ProvideToken && (
            <div>
              <StepTitle icon={icons.group}>{t("user-registration.join-a-group")}</StepTitle>
              <Divider />
              <CardContent>
                {t("user-registration.provide-registration-token-description")}
                <Box component="form" noValidate sx={{ mt: 2 }} onSubmit={event => event.preventDefault()}>
                  <TextField
                    fullWidth
                    variant="filled"
                    label={t("group.group-token")}
                    value={page.token ?? ""}
                    onChange={event => page.setToken(event.target.value)}
                    onBlur={() => tokenForm.touch("token")}
                    error={tokenForm.errorFor("token") !== null}
                    helperText={tokenForm.errorFor("token") ?? undefined}
                  />
                </Box>
              </CardContent>
              <Divider />
              <CardActions sx={{ mt: "auto", justifyContent: "space-between" }}>
                {backButton}
                <BaseButton
                  iconRight
                  icon={icons.forward}
                  disabled={!page.isTokenValid}
                  onClick={() => {
                    if (tokenForm.validate()) {
                      provideToken.next();
                    }
                  }}
                >
                  {t("general.next")}
                </BaseButton>
              </CardActions>
            </div>
          )}

          {state.ctx.state === States.ProvideGroupDetails && (
            <Box sx={{ width: "840px", maxWidth: "100%" }}>
              <StepTitle icon={icons.group}>{t("user-registration.group-details")}</StepTitle>
              <CardContent>{t("user-registration.group-details-description")}</CardContent>
              <Divider />
              <CardContent>
                <form noValidate onSubmit={event => event.preventDefault()}>
                  <TextField
                    fullWidth
                    variant="filled"
                    label={t("group.group-name")}
                    value={groupDetails.groupName}
                    onChange={event => groupDetails.setGroupName(event.target.value)}
                    onBlur={() => {
                      groupForm.touch("groupName");
                      void page.validGroupName();
                    }}
                    error={(page.groupErrorMessages[0] ?? groupForm.errorFor("groupName")) != null}
                    helperText={page.groupErrorMessages[0] ?? groupForm.errorFor("groupName") ?? undefined}
                  />
                  <Box sx={{ mt: -0.5, px: 1 }}>
                    <FormControlLabel
                      control={<Checkbox checked={groupDetails.groupPrivate} onChange={event => groupDetails.setGroupPrivate(event.target.checked)} />}
                      label={t("group.settings.keep-my-recipes-private")}
                    />
                    <Typography variant="caption" component="p" sx={{ mt: 0.5 }}>
                      {t("group.settings.keep-my-recipes-private-description")}
                    </Typography>
                    <FormControlLabel
                      control={<Checkbox checked={groupDetails.groupSeed} onChange={event => groupDetails.setGroupSeed(event.target.checked)} />}
                      label={t("data-pages.seed-data")}
                    />
                    <Typography variant="caption" component="p" sx={{ mt: 0.5 }}>
                      {t("user-registration.use-seed-data-description")}
                    </Typography>
                  </Box>
                </form>
              </CardContent>
              <Divider />
              <CardActions sx={{ justifyContent: "space-between" }}>
                {backButton}
                <BaseButton
                  iconRight
                  icon={icons.forward}
                  disabled={!groupForm.isValid || !page.groupNameValid}
                  onClick={() => void groupDetails.next()}
                >
                  {t("general.next")}
                </BaseButton>
              </CardActions>
            </Box>
          )}

          {state.ctx.state === States.ProvideAccountDetails && (
            <div>
              <UserRegistrationForm onChange={page.setIsAccountFormValid} />
              <Divider />
              <CardActions sx={{ justifyContent: "space-between" }}>
                {backButton}
                <BaseButton
                  iconRight
                  icon={icons.forward}
                  disabled={!page.isAccountFormValid}
                  onClick={() => void page.accountDetailsNext()}
                >
                  {t("general.next")}
                </BaseButton>
              </CardActions>
            </div>
          )}

          {state.ctx.state === States.Confirmation && (
            <Box sx={{ width: "840px", maxWidth: "100%" }}>
              <Typography variant="h6" component="div" sx={{ display: "flex", alignItems: "center", px: 2, pt: 2, mb: 0, pb: 0 }}>
                <MdiIcon path={icons.user} size="large" sx={{ mr: 1.5 }} />
                <span>{t("general.confirm")}</span>
              </Typography>
              <List>
                {page.confirmationData.map((item, idx) => (
                  <Fragment key={item.text}>
                    {item.display && (
                      <ListItem>
                        <ListItemText primary={item.text} secondary={item.value} />
                      </ListItem>
                    )}
                    {idx !== page.confirmationData.length - 1 && <Divider />}
                  </Fragment>
                ))}
              </List>

              <Divider />
              <CardActions sx={{ justifyContent: "space-between" }}>
                {backButton}
                <BaseButton icon={icons.check} onClick={() => void page.submitRegistration()}>
                  {t("general.submit")}
                </BaseButton>
              </CardActions>
            </Box>
          )}
        </Box>

        <CardActions sx={{ justifyContent: "center", flexDirection: "column", py: 4, gap: 1 }}>
          <Button variant="text" component={Link} to="/login" sx={{ mb: 1 }}>
            {t("user.login")}
          </Button>
          <BaseButton color="primary" icon={icons.translate} onClick={() => page.setLangDialog(true)}>
            {t("language-dialog.choose-language")}
          </BaseButton>
        </CardActions>
      </Card>
      <LanguageDialog open={page.langDialog} onOpenChange={page.setLangDialog} />
    </Container>
  );
}
