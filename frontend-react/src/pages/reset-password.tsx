import { useState, type FormEvent } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { Link, useNavigate } from "react-router";
import { BaseDivider } from "@/components/global/BaseDivider";
import { MdiIcon } from "@/components/global/MdiIcon";
import { useUserApi } from "@/hooks/api";
import { useRouteQuery } from "@/hooks/use-router";
import { alert } from "@/hooks/use-toast";
import { validators } from "@/hooks/use-validators";
import { field, useFormValidation, usePageTitle } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import { icons } from "@/lib/icons";

function startIcon(path: string) {
  return {
    input: {
      startAdornment: (
        <InputAdornment position="start">
          <MdiIcon path={path} />
        </InputAdornment>
      ),
    },
  };
}

export default function ResetPasswordPage() {
  const i18n = useI18n();
  const navigate = useNavigate();

  const [state, setState] = useState({
    email: "",
    password: "",
    passwordConfirm: "",
  });
  const [loading, setLoading] = useState(false);

  const passwordMatch = () => state.password === state.passwordConfirm || i18n.t("user.password-must-match");
  const form = useFormValidation({
    password: field(state.password, [validators.required]),
    passwordConfirm: field(state.passwordConfirm, [validators.required, passwordMatch]),
  });

  // Set page title
  usePageTitle(i18n.t("user.login"));

  // ===================
  // Token Getter
  const [token] = useRouteQuery<string>("token", "");

  // ===================
  // API
  const api = useUserApi();
  async function requestLink(event: FormEvent) {
    event.preventDefault();
    if (!form.validate()) {
      return;
    }

    setLoading(true);
    const { response } = await api.users.resetPassword({
      token: token ?? "",
      email: state.email,
      password: state.password,
      passwordConfirm: state.passwordConfirm,
    });

    setLoading(false);

    if (response?.status === 200) {
      alert.success(i18n.t("user.password-updated"));
      await navigate("/login");
    }
    else {
      alert.error(i18n.t("events.something-went-wrong"));
    }
  }

  return (
    <Container maxWidth={false} sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "calc(100vh - 48px)" }}>
      <Card elevation={0} sx={{ bgcolor: "background.default", display: "flex", flexDirection: "column", alignItems: "center", width: "600px", maxWidth: "100%" }}>
        <Typography variant="h5" component="h1" sx={{ pt: 2, pb: 1, textAlign: "center" }}>
          {i18n.t("user.reset-password")}
        </Typography>
        <BaseDivider />
        <CardContent sx={{ width: "100%" }}>
          <form noValidate onSubmit={event => void requestLink(event)}>
            <TextField
              fullWidth
              variant="filled"
              autoFocus
              name="login"
              label={i18n.t("user.email")}
              type="text"
              value={state.email}
              onChange={event => setState({ ...state, email: event.target.value })}
              sx={{ mb: 2.5 }}
              slotProps={startIcon(icons.email)}
            />
            <TextField
              fullWidth
              variant="filled"
              name="password"
              label={i18n.t("user.password")}
              type="password"
              value={state.password}
              onChange={event => setState({ ...state, password: event.target.value })}
              {...form.fieldProps("password")}
              sx={{ mb: 2.5 }}
              slotProps={startIcon(icons.lock)}
            />
            <TextField
              fullWidth
              variant="filled"
              name="password"
              label={i18n.t("user.confirm-password")}
              type="password"
              value={state.passwordConfirm}
              onChange={event => setState({ ...state, passwordConfirm: event.target.value })}
              {...form.fieldProps("passwordConfirm")}
              // validate-on="blur"
              onInput={undefined}
              onBlur={() => form.touch("passwordConfirm")}
              sx={{ mb: 2 }}
              slotProps={startIcon(icons.lock)}
            />
            <Box component="p" sx={{ textAlign: "center" }}>
              {i18n.t("user.please-enter-password")}
            </Box>
            <CardActions sx={{ justifyContent: "center" }}>
              <Box sx={{ width: "300px", maxWidth: "100%" }}>
                <Button
                  loading={loading}
                  color="primary"
                  variant="contained"
                  disabled={token === ""}
                  type="submit"
                  size="large"
                  fullWidth
                  sx={{ borderRadius: "24px" }}
                  startIcon={<MdiIcon path={icons.lock} />}
                >
                  {/* Vue shows this fallback label in English too (no locale key exists) */}
                  {token === "" ? "Token Required" : i18n.t("user.reset-password")}
                </Button>
              </Box>
            </CardActions>
          </form>
        </CardContent>
        <Button sx={{ mx: "auto" }} variant="text" component={Link} to="/login">
          {i18n.t("user.login")}
        </Button>
      </Card>
    </Container>
  );
}
