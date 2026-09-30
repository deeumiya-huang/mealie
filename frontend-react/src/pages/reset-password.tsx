import { useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CardActions from "@mui/material/CardActions";
import CircularProgress from "@mui/material/CircularProgress";
import { useNavigate, useSearchParams } from "react-router";
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

export default function ResetPasswordPage() {
  const i18n = useI18n();
  const api = useUserApi();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const form = useRef<FormHandle>(null);
  const [state, setState] = useState({ email: "", password: "", passwordConfirm: "", loading: false });

  useSeoMeta({ title: i18n.t("user.login") });

  const passwordMatch = () => state.password === state.passwordConfirm || i18n.t("user.password-must-match");

  async function requestLink() {
    if (!form.current?.validate()) return;

    setState(s => ({ ...s, loading: true }));
    // TODO: Fix Response to send meaningful error
    const { response } = await api.users.resetPassword({
      token,
      email: state.email,
      password: state.password,
      passwordConfirm: state.passwordConfirm,
    });
    setState(s => ({ ...s, loading: false }));

    if (response?.status === 200) {
      alert.success(i18n.t("user.password-updated"));
      await navigate("/login");
    }
    else {
      alert.error(i18n.t("events.something-went-wrong"));
    }
  }

  return (
    <AuthCard title={i18n.t("user.reset-password")}>
      <VForm ref={form} onSubmit={() => void requestLink()}>
        <TextInput
          value={state.email}
          onChange={email => setState({ ...state, email })}
          prependInnerIcon={icons.email}
          variant="solo-filled"
          autoFocus
          name="login"
          label={i18n.t("user.email")}
          type="text"
        />
        <TextInput
          value={state.password}
          onChange={password => setState({ ...state, password })}
          variant="solo-filled"
          prependInnerIcon={icons.lock}
          name="password"
          label={i18n.t("user.password")}
          type="password"
          rules={[validators.required]}
        />
        <TextInput
          value={state.passwordConfirm}
          onChange={passwordConfirm => setState({ ...state, passwordConfirm })}
          variant="solo-filled"
          prependInnerIcon={icons.lock}
          name="password"
          label={i18n.t("user.confirm-password")}
          type="password"
          rules={[validators.required, passwordMatch]}
        />
        <p style={{ textAlign: "center" }}>{i18n.t("user.please-enter-password")}</p>
        <CardActions sx={{ justifyContent: "center" }}>
          <Box sx={{ width: 300 }}>
            <Button
              disabled={token === "" || state.loading}
              color="primary"
              variant="contained"
              type="submit"
              size="large"
              fullWidth
              sx={{ borderRadius: 6 }}
              startIcon={state.loading ? <CircularProgress size={18} color="inherit" /> : <Icon path={icons.lock} />}
            >
              {token === "" ? "Token Required" : i18n.t("user.reset-password")}
            </Button>
          </Box>
        </CardActions>
      </VForm>
    </AuthCard>
  );
}
