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
import { alert } from "@/hooks/use-toast";
import { validators } from "@/hooks/use-validators";
import { field, useFormValidation, usePageTitle } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import { icons } from "@/lib/icons";

export default function ForgotPasswordPage() {
  const i18n = useI18n();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const form = useFormValidation({ email: field(email, [validators.email]) });

  // Set page title
  usePageTitle(i18n.t("user.login"));

  const api = useUserApi();

  async function requestLink(event: FormEvent) {
    event.preventDefault();
    if (!form.validate()) {
      return;
    }

    setLoading(true);
    const { response } = await api.email.sendForgotPassword({ email });

    setLoading(false);

    if (response?.status === 200) {
      alert.success(i18n.t("profile.email-sent"));
      await navigate("/login");
    }
    else {
      alert.error(i18n.t("profile.error-sending-email"));
    }
  }

  return (
    <Container maxWidth={false} sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "calc(100vh - 48px)" }}>
      <Card elevation={0} sx={{ bgcolor: "background.default", display: "flex", flexDirection: "column", alignItems: "center", width: "600px", maxWidth: "100%" }}>
        <Typography variant="h5" component="h1" sx={{ pt: 2, pb: 1, textAlign: "center" }}>
          {i18n.t("user.forgot-password")}
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
              value={email}
              onChange={event => setEmail(event.target.value)}
              {...form.fieldProps("email")}
              sx={{ mb: 2 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <MdiIcon path={icons.email} />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Box component="p" sx={{ textAlign: "center" }}>
              {i18n.t("user.forgot-password-text")}
            </Box>
            <CardActions sx={{ justifyContent: "center" }}>
              <Box sx={{ width: "300px", maxWidth: "100%" }}>
                <Button
                  loading={loading}
                  color="primary"
                  variant="contained"
                  type="submit"
                  size="large"
                  fullWidth
                  sx={{ borderRadius: "24px" }}
                  startIcon={<MdiIcon path={icons.email} />}
                >
                  {i18n.t("user.reset-password")}
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
