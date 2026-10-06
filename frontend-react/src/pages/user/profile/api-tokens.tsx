import { useRef, useState, type FormEvent } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { AppButtonCopy } from "@/components/global/AppButtonCopy";
import { BaseButton } from "@/components/global/BaseButton";
import { BaseCardSectionTitle } from "@/components/global/BaseCardSectionTitle";
import { BaseImg } from "@/components/global/BaseImg";
import { BasePageTitle } from "@/components/global/BasePageTitle";
import { useUserApi } from "@/hooks/api";
import { useMealieAuth } from "@/hooks/use-mealie-auth";
import { usePageTitle } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import type { LongLiveTokenCreateResponse } from "@/lib/api/types/user";

export default function UserApiTokensPage() {
  const { t, d } = useI18n();
  const auth = useMealieAuth();
  const api = useUserApi();

  usePageTitle(t("settings.token.api-tokens"));

  const user = auth.user;
  const tokens = user?.tokens ?? [];

  const [createdToken, setCreatedToken] = useState("");
  const [name, setName] = useState("");
  // Not rendered: it only decides whether the next "generate" click starts over (as in Vue).
  const loading = useRef(false);

  function resetCreate() {
    setCreatedToken("");
    loading.current = false;
    setName("");
    void auth.getSession();
  }

  async function createToken(tokenName: string) {
    if (loading.current) {
      resetCreate();
      return;
    }

    loading.current = true;

    const { data } = await api.users.createAPIToken({ name: tokenName });

    if (data) {
      setCreatedToken((data as LongLiveTokenCreateResponse).token);
    }
  }

  async function deleteToken(id: number) {
    const { data } = await api.users.deleteAPIToken(id);
    void auth.getSession();
    return data;
  }

  return (
    <Container sx={{ maxWidth: "800px !important" }}>
      <BasePageTitle
        divider
        header={<BaseImg width="100%" maxHeight="200px" maxWidth="200px" src="/svgs/manage-api-tokens.svg" />}
        title={t("settings.token.api-tokens")}
      >
        {t("settings.token.you-have-token-count", tokens.length)}
      </BasePageTitle>
      <Box component="section" sx={{ display: "flex", justifyContent: "center" }}>
        <Card elevation={0} sx={{ mt: 2, p: 2, width: "100%" }}>
          <Typography variant="h6" component="div" sx={{ px: 0, pb: 1 }}>
            {t("settings.token.create-an-api-token")}
          </Typography>
          <CardContent sx={{ px: 0 }}>
            <form onSubmit={(event: FormEvent) => event.preventDefault()}>
              <TextField
                fullWidth
                variant="filled"
                label={t("settings.token.token-name")}
                value={name}
                onChange={event => setName(event.target.value)}
              />
            </form>

            {createdToken !== "" && (
              <>
                <TextField
                  fullWidth
                  multiline
                  variant="filled"
                  rows={3}
                  label={t("settings.token.api-token")}
                  value={createdToken}
                  slotProps={{ input: { readOnly: true } }}
                  sx={{ mt: 1, mb: 0, pb: 0 }}
                />
                <p>
                  {t("settings.token.copy-this-token-for-use-with-an-external-application-this-token-will-not-be-viewable-again")}
                </p>
              </>
            )}
          </CardContent>
          <CardActions sx={{ px: 0 }}>
            {createdToken && (
              <BaseButton cancel onClick={() => resetCreate()}>
                {t("general.close")}
              </BaseButton>
            )}
            <Box sx={{ flexGrow: 1 }} />
            {createdToken
              ? <AppButtonCopy icon={false} color="info" copyText={createdToken} />
              : (
                  <BaseButton key="generate-button" disabled={name === ""} onClick={() => void createToken(name)}>
                    {t("settings.token.generate")}
                  </BaseButton>
                )}
          </CardActions>
        </Card>
      </Box>
      <Box sx={{ mt: 5 }}>
        <BaseCardSectionTitle title={t("settings.token.active-tokens")} />
      </Box>
      <Box component="section" sx={{ display: "flex", flexDirection: "column" }}>
        <List>
          {tokens.map(token => (
            <div key={token.id}>
              <ListItem
                secondaryAction={<BaseButton delete small onClick={() => void deleteToken(token.id)} />}
              >
                <ListItemText
                  primary={token.name}
                  secondary={t("general.created-on-date", [d(new Date(token.createdAt!))])}
                />
              </ListItem>
              <Divider sx={{ mx: 1, my: 1 }} />
            </div>
          ))}
        </List>
      </Box>
    </Container>
  );
}
