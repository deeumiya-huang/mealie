import { useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CardActions from "@mui/material/CardActions";
import CircularProgress from "@mui/material/CircularProgress";
import { useNavigate } from "react-router";
import { icons } from "~/lib/icons";
import { useUserApi } from "~/hooks/api";
import { useI18n } from "~/hooks/use-global-i18n";
import { useSeoMeta } from "~/hooks/use-seo-meta";
import { alert } from "~/hooks/use-toast";
import { validators } from "~/hooks/use-validators";
import { AuthCard } from "~/components/global/AuthCard";
import { Icon } from "~/components/global/Icon";
import { TextInput, VForm } from "~/components/global/form";
import type { FormHandle } from "~/components/global/form";

export default function ForgotPasswordPage() {
  const i18n = useI18n();
  const api = useUserApi();
  const navigate = useNavigate();
  const form = useRef<FormHandle>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  useSeoMeta({ title: i18n.t("user.login") });

  async function requestLink() {
    if (!form.current?.validate()) return;

    setLoading(true);
    // TODO: Fix Response to send meaningful error
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
    <AuthCard title={i18n.t("user.forgot-password")}>
      <VForm ref={form} onSubmit={() => void requestLink()}>
        <TextInput
          value={email}
          onChange={setEmail}
          prependInnerIcon={icons.email}
          variant="solo-filled"
          autoFocus
          name="login"
          label={i18n.t("user.email")}
          type="text"
          rules={[validators.email]}
        />
        <p style={{ textAlign: "center" }}>{i18n.t("user.forgot-password-text")}</p>
        <CardActions sx={{ justifyContent: "center" }}>
          <Box sx={{ width: 300 }}>
            <Button
              disabled={loading}
              color="primary"
              variant="contained"
              type="submit"
              size="large"
              fullWidth
              sx={{ borderRadius: 6 }}
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <Icon path={icons.email} />}
            >
              {i18n.t("user.reset-password")}
            </Button>
          </Box>
        </CardActions>
      </VForm>
    </AuthCard>
  );
}
