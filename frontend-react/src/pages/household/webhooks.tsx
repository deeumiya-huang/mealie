import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import { BaseButton } from "@/components/global/BaseButton";
import { BaseExpansionPanels } from "@/components/global/BaseExpansionPanels";
import { BaseImg } from "@/components/global/BaseImg";
import { BasePageTitle } from "@/components/global/BasePageTitle";
import { MdiIcon } from "@/components/global/MdiIcon";
import { GroupWebhookEditor } from "@/components/Domain/Household/GroupWebhookEditor";
import { timeUTC, useGroupWebhooks } from "@/hooks/use-group-webhooks";
import { alert } from "@/hooks/use-toast";
import { usePageTitle } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import { icons } from "@/lib/icons";

export default function HouseholdWebhooksPage() {
  const { t, d } = useI18n();
  const { actions, webhooks } = useGroupWebhooks();

  usePageTitle(t("settings.webhooks.webhooks"));

  return (
    <Container sx={{ maxWidth: "800px !important" }}>
      <BasePageTitle
        divider
        header={<BaseImg width="100%" maxHeight={125} maxWidth={125} src="/svgs/manage-webhooks.svg" />}
        title={t("settings.webhooks.webhooks")}
      >
        <CardContent sx={{ pb: 0 }}>
          {t("settings.webhooks.description")}
        </CardContent>
      </BasePageTitle>

      <BaseButton create onClick={() => void actions.createOne()} />
      <Box sx={{ mt: 1 }}>
        <BaseExpansionPanels>
          {(webhooks ?? []).map((webhook, index) => (
            <Accordion
              key={index}
              disableGutters
              sx={{ my: 1, borderRadius: 1, borderLeft: "5px solid", borderLeftColor: "primary.main" }}
            >
              <AccordionSummary
                sx={{ "& .MuiAccordionSummary-expandIconWrapper.Mui-expanded": { transform: "none" } }}
                expandIcon={<MdiIcon path={icons.edit} />}
              >
                <Box sx={{ display: "flex", alignItems: "center", fontSize: "1.5rem" }}>
                  <MdiIcon
                    size="large"
                    color={webhook.enabled ? "info" : undefined}
                    sx={{ mr: 1 }}
                    path={icons.webhook}
                  />
                  {`${webhook.name} - ${d(timeUTC(webhook.scheduledTime), "time")}`}
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <GroupWebhookEditor
                  key={webhook.id}
                  webhook={webhook}
                  onSave={updated => void actions.updateOne(updated)}
                  onDelete={id => void actions.deleteOne(id)}
                  onTest={id => void actions.testOne(id).then(() => alert.success(t("events.test-message-sent")))}
                />
              </AccordionDetails>
            </Accordion>
          ))}
        </BaseExpansionPanels>
      </Box>
    </Container>
  );
}
