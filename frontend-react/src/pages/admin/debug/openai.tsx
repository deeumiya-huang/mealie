import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { AppButtonUpload } from "~/components/global/AppButtonUpload";
import { BaseButton } from "~/components/global/BaseButton";
import { BaseCardSectionTitle } from "~/components/global/BaseCardSectionTitle";
import { BaseContainer } from "~/components/global/BaseContainer";
import { DocLink } from "~/components/global/DocLink";
import { Icon } from "~/components/global/Icon";
import { SelectInput, VForm } from "~/components/global/form";
import { useAdminApi } from "~/hooks/api";
import { useI18n } from "~/hooks/use-global-i18n";
import { useGroups } from "~/hooks/use-groups";
import { useSeoMeta } from "~/hooks/use-seo-meta";
import { alert } from "~/hooks/use-toast";
import type { AIProviderSummary } from "~/lib/api/types/group";
import type { GroupInDB } from "~/lib/api/types/user";
import { icons } from "~/lib/icons";

export default function AdminDebugOpenAIPage() {
  const api = useAdminApi();
  const i18n = useI18n();

  useSeoMeta({ title: i18n.t("admin.debug-openai-services") });

  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState("");
  const [uploadedImage, setUploadedImage] = useState<File | undefined>();
  const [uploadedImagePreviewUrl, setUploadedImagePreviewUrl] = useState<string | undefined>();

  // Group + provider selection
  const { groups } = useGroups();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const groupProviders: AIProviderSummary[] = selectedGroupId
    ? groups?.find(g => g.id === selectedGroupId)?.aiProviderSettings?.providers ?? []
    : [];

  function changeGroup(id: string | null) {
    setSelectedGroupId(id);
    setSelectedProviderId(null);
  }

  // release the preview's object URL when it's replaced or the page unmounts
  useEffect(() => () => {
    if (uploadedImagePreviewUrl) URL.revokeObjectURL(uploadedImagePreviewUrl);
  }, [uploadedImagePreviewUrl]);

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
    <BaseContainer sx={{ p: 0 }}>
      <BaseContainer>
        <BaseCardSectionTitle title={i18n.t("admin.debug-openai-services")}>
          {i18n.t("admin.debug-openai-services-description")}
          <br />
          <Box sx={{ mt: 1 }}>
            <DocLink link="/documentation/getting-started/installation/ai-providers" />
          </Box>
        </BaseCardSectionTitle>
      </BaseContainer>
      <VForm
        onSubmit={(e) => {
          e.preventDefault();
          void testOpenAI();
        }}
      >
        <Box sx={{ p: 2 }}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              {groups && (
                <SelectInput<GroupInDB, string | null>
                  value={selectedGroupId}
                  onChange={changeGroup}
                  items={groups}
                  itemTitle="name"
                  itemValue="id"
                  label={i18n.t("group.group")}
                  density="compact"
                  variant="outlined"
                  clearable
                  hideDetails
                />
              )}
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <SelectInput<AIProviderSummary, string | null>
                value={selectedProviderId}
                onChange={setSelectedProviderId}
                items={groupProviders}
                itemTitle="name"
                itemValue="id"
                label={i18n.t("group.ai-provider-settings.ai-provider")}
                density="compact"
                variant="outlined"
                clearable
                hideDetails
                disabled={!selectedGroupId}
              />
            </Grid>
          </Grid>
          <Box sx={{ mt: 3 }}>
            {!uploadedImage
              ? (
                  <AppButtonUpload
                    url="none"
                    fileName="image"
                    accept="image/*"
                    text={i18n.t("recipe.upload-image")}
                    textBtn={false}
                    post={false}
                    onUploaded={uploadImage}
                  />
                )
              : (
                  <Button variant="contained" color="error" startIcon={<Icon path={icons.close} />} onClick={clearImage}>
                    {i18n.t("recipe.remove-image")}
                  </Button>
                )}
          </Box>
          {uploadedImage && uploadedImagePreviewUrl && (
            <Box sx={{ maxWidth: "25%", mt: 3 }}>
              <Box component="img" src={uploadedImagePreviewUrl} alt="" sx={{ width: "100%" }} />
            </Box>
          )}
        </Box>
        <Box sx={{ display: "flex", p: 1 }}>
          <Box sx={{ ml: "auto" }}>
            <BaseButton
              type="submit"
              disabled={!selectedProviderId}
              text={i18n.t("admin.run-test")}
              icon={icons.check}
              loading={loading}
            />
          </Box>
        </Box>
      </VForm>
      {response && (
        <>
          <Divider sx={{ mt: 2 }} />
          <Box>
            <Typography variant="h6" sx={{ px: 2, pt: 2 }}>{i18n.t("admin.test-results")}</Typography>
            <Box sx={{ p: 2 }}>{response}</Box>
          </Box>
        </>
      )}
    </BaseContainer>
  );
}
