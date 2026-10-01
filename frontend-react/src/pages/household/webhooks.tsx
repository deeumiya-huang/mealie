import { useState } from "react";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { BaseButton } from "~/components/global/BaseButton";
import { BaseContainer } from "~/components/global/BaseContainer";
import { BasePageTitle, BasePageTitleImage } from "~/components/global/BasePageTitle";
import { Icon } from "~/components/global/Icon";
import { GroupWebhookEditor } from "~/components/Domain/Household/GroupWebhookEditor";
import { timeUTC, useGroupWebhooks } from "~/hooks/use-group-webhooks";
import { useI18n } from "~/hooks/use-global-i18n";
import { useSeoMeta } from "~/hooks/use-seo-meta";
import { alert } from "~/hooks/use-toast";
import { icons } from "~/lib/icons";

export default function HouseholdWebhooksPage() {
  const i18n = useI18n();
  const { actions, webhooks } = useGroupWebhooks();
  const [expanded, setExpanded] = useState<number | null>(null);

  useSeoMeta({ title: i18n.t("settings.webhooks.webhooks") });

  return (
    <BaseContainer sx={{ maxWidth: { md: 900 } }}>
      <BasePageTitle
        divider
        header={<BasePageTitleImage src="/svgs/manage-webhooks.svg" maxWidth={125} maxHeight={125} />}
        title={i18n.t("settings.webhooks.webhooks")}
      >
        <Box sx={{ px: 2, pt: 2 }}>{i18n.t("settings.webhooks.description")}</Box>
      </BasePageTitle>

      <BaseButton create onClick={() => void actions.createOne()} />
      <Box sx={{ mt: 1 }}>
        {(webhooks ?? []).map((webhook, index) => (
          <Accordion
            key={index}
            expanded={expanded === index}
            onChange={(_, open) => setExpanded(open ? index : null)}
            className="left-border"
            sx={{ "my": 1, "borderRadius": 1, "&:before": { display: "none" } }}
            slotProps={{ transition: { unmountOnExit: true } }}
          >
            <AccordionSummary sx={{ "& .MuiAccordionSummary-content": { alignItems: "center" } }}>
              <Typography variant="h6" sx={{ display: "flex", alignItems: "center", flexGrow: 1 }}>
                <Icon path={icons.webhook} size="large" start color={webhook.enabled ? "info" : undefined} />
                {webhook.name}
                {" - "}
                {i18n.d(timeUTC(webhook.scheduledTime), "time")}
              </Typography>
              <IconButton size="small" sx={{ ml: 1 }}>
                <Icon path={icons.edit} />
              </IconButton>
            </AccordionSummary>
            <AccordionDetails>
              <GroupWebhookEditor
                key={webhook.id}
                webhook={webhook}
                onSave={w => void actions.updateOne(w)}
                onDelete={id => void actions.deleteOne(id)}
                onTest={id => void actions.testOne(id).then(() => alert.success(i18n.t("events.test-message-sent")))}
              />
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>
    </BaseContainer>
  );
}
