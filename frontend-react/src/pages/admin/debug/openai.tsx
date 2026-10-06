import { useEffect, useState, type FormEvent } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { AppButtonUpload } from "@/components/global/AppButtonUpload";
import { BaseButton } from "@/components/global/BaseButton";
import { BaseCardSectionTitle } from "@/components/global/BaseCardSectionTitle";
import { DocLink } from "@/components/global/DocLink";
import { MdiIcon } from "@/components/global/MdiIcon";
import { useAdminApi } from "@/hooks/api";
import { useGroups } from "@/hooks/use-groups";
import { alert } from "@/hooks/use-toast";
import { usePageTitle } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import type { AIProviderSummary } from "@/lib/api/types/group";
import type { GroupInDB } from "@/lib/api/types/user";
import { icons } from "@/lib/icons";

export default function AdminDebugOpenAIPage() {
  const { t } = useI18n();
  const api = useAdminApi();

  // Set page title
  usePageTitle(t("admin.debug-openai-services"));

  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState("");

  const [uploadedImage, setUploadedImage] = useState<Blob | File | undefined>(undefined);
  const [uploadedImagePreviewUrl, setUploadedImagePreviewUrl] = useState<string | undefined>(undefined);

  // Group + provider selection
  const { groups } = useGroups();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);

  const groupProviders: AIProviderSummary[] = selectedGroupId
    ? (groups?.find(g => g.id === selectedGroupId)?.aiProviderSettings?.providers ?? [])
    : [];

  // Release the preview's object URL when it is replaced or the page closes.
  useEffect(() => {
    return () => {
      if (uploadedImagePreviewUrl) URL.revokeObjectURL(uploadedImagePreviewUrl);
    };
  }, [uploadedImagePreviewUrl]);

  function selectGroup(group: GroupInDB | null) {
    // a different group has different providers
    setSelectedGroupId(group?.id ?? null);
    setSelectedProviderId(null);
  }

  function uploadImage(fileObject: unknown) {
    setUploadedImage(fileObject as File);
    setUploadedImagePreviewUrl(URL.createObjectURL(fileObject as File));
  }

  function clearImage() {
    setUploadedImage(undefined);
    setUploadedImagePreviewUrl(undefined);
  }

  async function testOpenAI() {
    if (!selectedProviderId) {
      alert.error("Please select a provider");
      return;
    }

    setResponse("");

    setLoading(true);
    const { data } = await api.debug.debugOpenAI(selectedProviderId, uploadedImage);
    setLoading(false);

    if (!data) {
      alert.error("Unable to test OpenAI services");
    }
    else {
      setResponse(data.response || (data.success ? "Test Successful" : "Test Failed"));
    }
  }

  return (
    <Container disableGutters maxWidth={false} sx={{ p: 0 }}>
      <Container>
        <BaseCardSectionTitle title={t("admin.debug-openai-services")}>
          {t("admin.debug-openai-services-description")}
          <br />
          <DocLink link="/documentation/getting-started/installation/ai-providers" />
        </BaseCardSectionTitle>
      </Container>
      <form
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          void testOpenAI();
        }}
      >
        <div>
          <CardContent>
            <Container disableGutters sx={{ p: 0 }}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  {groups && (
                    <Autocomplete
                      size="small"
                      options={groups}
                      value={groups.find(g => g.id === selectedGroupId) ?? null}
                      getOptionLabel={group => group.name}
                      isOptionEqualToValue={(option, value) => option.id === value.id}
                      onChange={(_event, group) => selectGroup(group)}
                      renderInput={params => <TextField {...params} label={t("group.group")} />}
                    />
                  )}
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Autocomplete
                    size="small"
                    options={groupProviders}
                    value={groupProviders.find(p => p.id === selectedProviderId) ?? null}
                    disabled={!selectedGroupId}
                    getOptionLabel={provider => provider.name}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    onChange={(_event, provider) => setSelectedProviderId(provider?.id ?? null)}
                    renderInput={params => <TextField {...params} label={t("group.ai-provider-settings.ai-provider")} />}
                  />
                </Grid>
              </Grid>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid sx={{ alignSelf: "center" }}>
                  {!uploadedImage && (
                    <AppButtonUpload
                      url="none"
                      fileName="image"
                      accept="image/*"
                      text={t("recipe.upload-image")}
                      textBtn={false}
                      post={false}
                      onUploaded={uploadImage}
                    />
                  )}
                  {!!uploadedImage && (
                    <Button
                      variant="contained"
                      color="error"
                      startIcon={<MdiIcon path={icons.close} />}
                      onClick={clearImage}
                    >
                      {t("recipe.remove-image")}
                    </Button>
                  )}
                </Grid>
              </Grid>
              {uploadedImage && uploadedImagePreviewUrl && (
                <Box sx={{ maxWidth: "25%", mt: 1 }}>
                  <Box component="img" src={uploadedImagePreviewUrl} alt="" sx={{ width: "100%", display: "block" }} />
                </Box>
              )}
            </Container>
          </CardContent>
          <CardActions>
            <BaseButton
              type="submit"
              disabled={!selectedProviderId}
              text={t("admin.run-test")}
              icon={icons.check}
              loading={loading}
              sx={{ ml: "auto" }}
            />
          </CardActions>
        </div>
      </form>
      {response && <Divider sx={{ mt: 2 }} />}
      {response && (
        <Container disableGutters sx={{ m: 0, p: 0 }}>
          <Typography variant="h6" component="div" sx={{ p: 2, pb: 0 }}>{t("admin.test-results")}</Typography>
          <CardContent>{response}</CardContent>
        </Container>
      )}
    </Container>
  );
}
