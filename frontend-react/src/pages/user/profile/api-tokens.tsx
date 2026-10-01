import { useRef, useState } from "react";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { AppButtonCopy } from "~/components/global/AppButtonCopy";
import { BaseButton } from "~/components/global/BaseButton";
import { BaseCardSectionTitle } from "~/components/global/BaseCardSectionTitle";
import { BaseContainer } from "~/components/global/BaseContainer";
import { BasePageTitle, BasePageTitleImage } from "~/components/global/BasePageTitle";
import { TextInput, VForm } from "~/components/global/form";
import type { FormHandle } from "~/components/global/form";
import { useUserApi } from "~/hooks/api";
import { useI18n } from "~/hooks/use-global-i18n";
import { useMealieAuth } from "~/hooks/use-mealie-auth";
import { useSeoMeta } from "~/hooks/use-seo-meta";

export default function ApiTokensPage() {
  const i18n = useI18n();
  const auth = useMealieAuth();
  const api = useUserApi();

  useSeoMeta({ title: i18n.t("settings.token.api-tokens") });

  const user = auth.user;
  const domNewTokenForm = useRef<FormHandle>(null);

  const [createdToken, setCreatedToken] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  function resetCreate() {
    setCreatedToken("");
    setLoading(false);
    setName("");
    void auth.getSession();
  }

  async function createToken(name: string) {
    if (loading) {
      resetCreate();
      return;
    }

    setLoading(true);

    if (!domNewTokenForm.current?.validate()) {
      return;
    }

    const { data } = await api.users.createAPIToken({ name });

    if (data) {
      setCreatedToken(data.token);
    }
  }

  async function deleteToken(id: number) {
    const { data } = await api.users.deleteAPIToken(id);
    void auth.getSession();
    return data;
  }

  if (!user) return null;

  return (
    <BaseContainer className="narrow-container">
      <BasePageTitle
        divider
        header={<BasePageTitleImage src="/svgs/manage-api-tokens.svg" maxWidth={200} maxHeight={200} />}
        title={i18n.t("settings.token.api-tokens")}
      >
        {i18n.t("settings.token.you-have-token-count", user.tokens?.length ?? 0)}
      </BasePageTitle>
      <Box component="section" sx={{ display: "flex", justifyContent: "center" }}>
        <Paper elevation={0} sx={{ mt: 2, p: 2, width: "100%" }}>
          <Typography variant="h6">{i18n.t("settings.token.create-an-api-token")}</Typography>
          <Box sx={{ py: 2 }}>
            <VForm ref={domNewTokenForm} onSubmit={e => e.preventDefault()}>
              <TextInput value={name} onChange={setName} label={i18n.t("settings.token.token-name")} />
            </VForm>

            {createdToken !== "" && (
              <>
                <TextInput
                  value={createdToken}
                  label={i18n.t("settings.token.api-token")}
                  readOnly
                  multiline
                  rows={3}
                  sx={{ mt: 2 }}
                />
                <p>
                  {i18n.t("settings.token.copy-this-token-for-use-with-an-external-application-this-token-will-not-be-viewable-again")}
                </p>
              </>
            )}
          </Box>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            {createdToken && (
              <BaseButton cancel onClick={resetCreate}>
                {i18n.t("general.close")}
              </BaseButton>
            )}
            <Box sx={{ flexGrow: 1 }} />
            {createdToken
              ? <AppButtonCopy icon={false} color="info" copyText={createdToken} />
              : (
                  <BaseButton key="generate-button" disabled={name === ""} onClick={() => void createToken(name)}>
                    {i18n.t("settings.token.generate")}
                  </BaseButton>
                )}
          </Box>
        </Paper>
      </Box>
      <Box sx={{ mt: 5 }}>
        <BaseCardSectionTitle title={i18n.t("settings.token.active-tokens")} />
      </Box>
      <Box component="section" sx={{ display: "flex", flexDirection: "column" }}>
        <List>
          {(user.tokens ?? []).map((token, index) => (
            <div key={index}>
              <ListItem
                secondaryAction={<BaseButton delete small onClick={() => void deleteToken(token.id)} />}
              >
                <ListItemText
                  primary={token.name}
                  secondary={i18n.t("general.created-on-date", [i18n.d(new Date(token.createdAt!))])}
                />
              </ListItem>
              <Divider sx={{ mx: 1, my: 1 }} />
            </div>
          ))}
        </List>
      </Box>
    </BaseContainer>
  );
}
