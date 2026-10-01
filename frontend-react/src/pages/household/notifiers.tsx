import { useCallback, useEffect, useState } from "react";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { BaseButton } from "~/components/global/BaseButton";
import { BaseButtonGroup } from "~/components/global/BaseButtonGroup";
import { BaseContainer } from "~/components/global/BaseContainer";
import { BaseDialog } from "~/components/global/BaseDialog";
import { BasePageTitle, BasePageTitleImage } from "~/components/global/BasePageTitle";
import { Icon } from "~/components/global/Icon";
import { TextInput } from "~/components/global/form";
import { useUserApi } from "~/hooks/api";
import { useI18n } from "~/hooks/use-global-i18n";
import { useSeoMeta } from "~/hooks/use-seo-meta";
import { icons } from "~/lib/icons";
import type { GroupEventNotifierCreate, GroupEventNotifierOut } from "~/lib/api/types/household";

interface OptionKey {
  text: string;
  key: keyof GroupEventNotifierOut["options"];
}

interface OptionSection {
  id: number;
  text: string;
  options: OptionKey[];
}

const APPRISE_LINKS = [
  { href: "https://github.com/caronc/apprise/wiki", text: "Apprise" },
  { href: "https://github.com/caronc/apprise/wiki/Notify_gotify", text: "Gotify" },
  { href: "https://github.com/caronc/apprise/wiki/Notify_discord", text: "Discord" },
  { href: "https://github.com/caronc/apprise/wiki/Notify_homeassistant", text: "Home Assistant" },
  { href: "https://github.com/caronc/apprise/wiki/Notify_matrix", text: "Matrix" },
  { href: "https://github.com/caronc/apprise/wiki/Notify_pushover", text: "Pushover" },
];

// The Vue page also sent `enabled` on create, and edited `appriseUrl` (absent from the Out schema)
type NotifierCreate = GroupEventNotifierCreate & { enabled: boolean };
type EditableNotifier = GroupEventNotifierOut & { appriseUrl?: string | null };

const emptyCreate = (): NotifierCreate => ({ name: "", enabled: true, appriseUrl: "" });

export default function HouseholdNotifiersPage() {
  const api = useUserApi();
  const i18n = useI18n();

  useSeoMeta({ title: i18n.t("profile.notifiers") });

  const [deleteDialog, setDeleteDialog] = useState(false);
  const [createDialog, setCreateDialog] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [notifiers, setNotifiers] = useState<EditableNotifier[] | undefined>(undefined);
  const [createNotifierData, setCreateNotifierData] = useState<NotifierCreate>(emptyCreate);

  const refreshNotifiers = useCallback(async () => {
    const { data } = await api.groupEventNotifier.getAll();
    setNotifiers(data?.items);
  }, [api]);

  useEffect(() => {
    void refreshNotifiers();
  }, [refreshNotifiers]);

  function updateNotifier(index: number, patch: Partial<EditableNotifier>) {
    setNotifiers(prev => prev?.map((n, i) => (i === index ? { ...n, ...patch } : n)));
  }

  async function createNewNotifier() {
    await api.groupEventNotifier.createOne(createNotifierData);
    void refreshNotifiers();
  }

  async function deleteNotifier(targetId: string) {
    await api.groupEventNotifier.deleteOne(targetId);
    void refreshNotifiers();
    setDeleteTargetId("");
  }

  async function saveNotifier(notifier: EditableNotifier) {
    await api.groupEventNotifier.updateOne(notifier.id, notifier);
    void refreshNotifiers();
  }

  // ===============================================================
  // Options Definitions

  const crud = (prefix: string): OptionKey[] => [
    { text: i18n.t("general.create"), key: `${prefix}Created` as OptionKey["key"] },
    { text: i18n.t("general.update"), key: `${prefix}Updated` as OptionKey["key"] },
    { text: i18n.t("general.delete"), key: `${prefix}Deleted` as OptionKey["key"] },
  ];
  const optionsSections: OptionSection[] = [
    { id: 1, text: i18n.t("events.recipe-events"), options: crud("recipe") },
    { id: 2, text: i18n.t("events.user-events"), options: [{ text: i18n.t("events.when-a-new-user-joins-your-group"), key: "userSignup" }] },
    { id: 3, text: i18n.t("events.mealplan-events"), options: crud("mealplanEntry") },
    { id: 4, text: i18n.t("events.shopping-list-events"), options: crud("shoppingList") },
    { id: 5, text: i18n.t("events.cookbook-events"), options: crud("cookbook") },
    { id: 6, text: i18n.t("events.tag-events"), options: crud("tag") },
    { id: 7, text: i18n.t("events.category-events"), options: crud("category") },
    { id: 8, text: i18n.t("events.label-events"), options: crud("label") },
  ];

  return (
    <BaseContainer sx={{ maxWidth: { md: 900 } }}>
      <BaseDialog
        open={deleteDialog}
        onOpenChange={setDeleteDialog}
        bottomSheet
        color="error"
        title={i18n.t("general.confirm")}
        icon={icons.alertCircle}
        canConfirm
        onConfirm={() => void deleteNotifier(deleteTargetId)}
      >
        <Box sx={{ px: 2, pb: 2 }}>{i18n.t("general.confirm-delete-generic")}</Box>
      </BaseDialog>
      <BaseDialog
        open={createDialog}
        onOpenChange={setCreateDialog}
        title={i18n.t("events.new-notification")}
        icon={icons.bellPlus}
        canSubmit
        onSubmit={() => void createNewNotifier()}
      >
        <Box sx={{ p: 2 }}>
          <TextInput value={createNotifierData.name} onChange={name => setCreateNotifierData({ ...createNotifierData, name })} label={i18n.t("general.name")} />
          <TextInput value={createNotifierData.appriseUrl} onChange={appriseUrl => setCreateNotifierData({ ...createNotifierData, appriseUrl })} label={i18n.t("events.apprise-url")} />
        </Box>
      </BaseDialog>

      <BasePageTitle
        divider
        header={<BasePageTitleImage src="/svgs/manage-notifiers.svg" maxWidth={125} maxHeight={125} />}
        title={i18n.t("events.event-notifiers")}
      >
        {i18n.t("events.new-notification-form-description")}
        <Box sx={{ mt: 1.5, display: "flex", flexWrap: "wrap", justifyContent: "space-between", mx: -1 }}>
          {APPRISE_LINKS.map(link => (
            <Link key={link.href} href={link.href} target="_blank" sx={{ mx: 1 }}>{link.text}</Link>
          ))}
        </Box>
      </BasePageTitle>

      <BaseButton create onClick={() => setCreateDialog(true)} />
      {notifiers && (
        <Box sx={{ mt: 1 }}>
          {notifiers.map((notifier, index) => (
            <Accordion
              key={index}
              expanded={expanded === index}
              onChange={(_, open) => setExpanded(open ? index : null)}
              className="left-border"
              sx={{ "my": 1, "borderRadius": 1, "&:before": { display: "none" } }}
              slotProps={{ transition: { unmountOnExit: true } }}
            >
              <AccordionSummary sx={{ "& .MuiAccordionSummary-content": { alignItems: "center" } }}>
                <Typography variant="h6" sx={{ flexGrow: 1 }}>{notifier.name}</Typography>
                <IconButton sx={{ ml: 1 }}><Icon path={icons.edit} /></IconButton>
              </AccordionSummary>
              <AccordionDetails>
                <TextInput value={notifier.name} onChange={name => updateNotifier(index, { name })} label={i18n.t("general.name")} />
                <TextInput
                  value={notifier.appriseUrl}
                  onChange={appriseUrl => updateNotifier(index, { appriseUrl })}
                  label={i18n.t("events.apprise-url-skipped-if-blank")}
                  hint={i18n.t("events.apprise-url-is-left-intentionally-blank")}
                />
                <FormControlLabel
                  control={<Checkbox size="small" checked={notifier.enabled} onChange={e => updateNotifier(index, { enabled: e.target.checked })} />}
                  label={i18n.t("events.enable-notifier")}
                />
                <Divider />
                <p style={{ paddingTop: 16 }}>{i18n.t("events.what-events")}</p>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {optionsSections.map(sec => (
                    <section key={sec.id}>
                      <Typography variant="subtitle1" component="h4" sx={{ fontWeight: "bold" }}>{sec.text}</Typography>
                      {sec.options.map(opt => (
                        <FormControlLabel
                          key={opt.key}
                          sx={{ display: "flex" }}
                          control={(
                            <Checkbox
                              size="small"
                              checked={!!notifier.options[opt.key]}
                              onChange={e => updateNotifier(index, { options: { ...notifier.options, [opt.key]: e.target.checked } })}
                            />
                          )}
                          label={opt.text}
                        />
                      ))}
                    </section>
                  ))}
                </Box>
                <Box sx={{ display: "flex", justifyContent: "flex-end", py: 0 }}>
                  <BaseButtonGroup
                    buttons={[
                      { icon: icons.delete, text: i18n.t("general.delete"), event: "delete" },
                      { icon: icons.testTube, text: i18n.t("general.test"), event: "test" },
                      { icon: icons.save, text: i18n.t("general.save"), event: "save" },
                    ]}
                    onEvent={(event) => {
                      if (event === "delete") {
                        setDeleteDialog(true);
                        setDeleteTargetId(notifier.id);
                      }
                      if (event === "save") void saveNotifier(notifier);
                      if (event === "test") void api.groupEventNotifier.test(notifier.id);
                    }}
                  />
                </Box>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}
    </BaseContainer>
  );
}
