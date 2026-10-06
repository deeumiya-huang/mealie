import { useEffect, useState } from "react";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Checkbox from "@mui/material/Checkbox";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import MuiLink from "@mui/material/Link";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { BaseButton } from "@/components/global/BaseButton";
import { BaseButtonGroup } from "@/components/global/BaseButtonGroup";
import { BaseDialog } from "@/components/global/BaseDialog";
import { BaseExpansionPanels } from "@/components/global/BaseExpansionPanels";
import { BaseImg } from "@/components/global/BaseImg";
import { BasePageTitle } from "@/components/global/BasePageTitle";
import { MdiIcon } from "@/components/global/MdiIcon";
import { useUserApi } from "@/hooks/api";
import { usePageTitle } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import type { GroupEventNotifierCreate, GroupEventNotifierOut } from "@/lib/api/types/household";
import { icons } from "@/lib/icons";

interface OptionKey {
  text: string;
  key: keyof GroupEventNotifierOut["options"];
}

interface OptionSection {
  id: number;
  text: string;
  options: OptionKey[];
}

/** The API sends no `appriseUrl` back, but the form can set one (blank = keep the stored URL). */
type NotifierEdit = GroupEventNotifierOut & { appriseUrl?: string | null };

const APPRISE_LINKS = [
  { href: "https://github.com/caronc/apprise/wiki", text: "Apprise" },
  { href: "https://github.com/caronc/apprise/wiki/Notify_gotify", text: "Gotify" },
  { href: "https://github.com/caronc/apprise/wiki/Notify_discord", text: "Discord" },
  { href: "https://github.com/caronc/apprise/wiki/Notify_homeassistant", text: "Home Assistant" },
  { href: "https://github.com/caronc/apprise/wiki/Notify_matrix", text: "Matrix" },
  { href: "https://github.com/caronc/apprise/wiki/Notify_pushover", text: "Pushover" },
];

export default function HouseholdNotifiersPage() {
  const { t } = useI18n();
  const api = useUserApi();

  usePageTitle(t("profile.notifiers"));

  const [deleteDialog, setDeleteDialog] = useState(false);
  const [createDialog, setCreateDialog] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState("");

  const [notifiers, setNotifiers] = useState<NotifierEdit[] | undefined>(undefined);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data } = await api.groupEventNotifier.getAll();
      if (active) {
        setNotifiers(data?.items);
      }
    })();
    return () => {
      active = false;
    };
  }, [api]);

  async function refreshNotifiers() {
    const { data } = await api.groupEventNotifier.getAll();
    setNotifiers(data?.items);
  }

  const [createNotifierData, setCreateNotifierData] = useState<GroupEventNotifierCreate & { enabled: boolean }>({
    name: "",
    enabled: true,
    appriseUrl: "",
  });

  async function createNewNotifier() {
    await api.groupEventNotifier.createOne(createNotifierData);
    await refreshNotifiers();
  }

  function openDelete(notifier: GroupEventNotifierOut) {
    setDeleteDialog(true);
    setDeleteTargetId(notifier.id);
  }

  async function deleteNotifier(targetId: string) {
    await api.groupEventNotifier.deleteOne(targetId);
    await refreshNotifiers();
    setDeleteTargetId("");
  }

  async function saveNotifier(notifier: NotifierEdit) {
    await api.groupEventNotifier.updateOne(notifier.id, notifier);
    await refreshNotifiers();
  }

  async function testNotifier(notifier: GroupEventNotifierOut) {
    await api.groupEventNotifier.test(notifier.id);
  }

  function updateNotifier(index: number, change: Partial<NotifierEdit>) {
    setNotifiers(current => current?.map((notifier, i) => (i === index ? { ...notifier, ...change } : notifier)));
  }

  // ===============================================================
  // Options Definitions

  const crud = (keys: [OptionKey["key"], OptionKey["key"], OptionKey["key"]]): OptionKey[] => [
    { text: t("general.create"), key: keys[0] },
    { text: t("general.update"), key: keys[1] },
    { text: t("general.delete"), key: keys[2] },
  ];

  const optionsSections: OptionSection[] = [
    {
      id: 1,
      text: t("events.recipe-events"),
      options: crud(["recipeCreated", "recipeUpdated", "recipeDeleted"]),
    },
    {
      id: 2,
      text: t("events.user-events"),
      options: [
        {
          text: t("events.when-a-new-user-joins-your-group"),
          key: "userSignup",
        },
      ],
    },
    {
      id: 3,
      text: t("events.mealplan-events"),
      options: crud(["mealplanEntryCreated", "mealplanEntryUpdated", "mealplanEntryDeleted"]),
    },
    {
      id: 4,
      text: t("events.shopping-list-events"),
      options: crud(["shoppingListCreated", "shoppingListUpdated", "shoppingListDeleted"]),
    },
    {
      id: 5,
      text: t("events.cookbook-events"),
      options: crud(["cookbookCreated", "cookbookUpdated", "cookbookDeleted"]),
    },
    {
      id: 6,
      text: t("events.tag-events"),
      options: crud(["tagCreated", "tagUpdated", "tagDeleted"]),
    },
    {
      id: 7,
      text: t("events.category-events"),
      options: crud(["categoryCreated", "categoryUpdated", "categoryDeleted"]),
    },
    {
      id: 8,
      text: t("events.label-events"),
      options: crud(["labelCreated", "labelUpdated", "labelDeleted"]),
    },
  ];

  return (
    <Container sx={{ maxWidth: "800px !important" }}>
      <BaseDialog
        open={deleteDialog}
        onOpenChange={setDeleteDialog}
        bottomSheet
        color="error"
        title={t("general.confirm")}
        icon={icons.alertCircle}
        canConfirm
        onConfirm={() => void deleteNotifier(deleteTargetId)}
      >
        <CardContent>
          {t("general.confirm-delete-generic")}
        </CardContent>
      </BaseDialog>
      <BaseDialog
        open={createDialog}
        onOpenChange={setCreateDialog}
        title={t("events.new-notification")}
        icon={icons.bellPlus}
        canSubmit
        onSubmit={() => void createNewNotifier()}
      >
        <CardContent>
          <TextField
            fullWidth
            variant="standard"
            label={t("general.name")}
            value={createNotifierData.name}
            onChange={event => setCreateNotifierData(current => ({ ...current, name: event.target.value }))}
          />
          <TextField
            fullWidth
            variant="standard"
            label={t("events.apprise-url")}
            value={createNotifierData.appriseUrl ?? ""}
            onChange={event => setCreateNotifierData(current => ({ ...current, appriseUrl: event.target.value }))}
            sx={{ mt: 1 }}
          />
        </CardContent>
      </BaseDialog>

      <BasePageTitle
        divider
        header={<BaseImg width="100%" maxHeight={125} maxWidth={125} src="/svgs/manage-notifiers.svg" />}
        title={t("events.event-notifiers")}
      >
        {t("events.new-notification-form-description")}

        <Box component="span" sx={{ mt: 1.5, mx: -1, display: "flex", flexWrap: "wrap", justifyContent: "space-between" }}>
          {APPRISE_LINKS.map(link => (
            <MuiLink
              key={link.href}
              href={link.href}
              target="_blanks"
              rel="noopener"
              underline="none"
              sx={{ mx: 1, color: "primary.main" }}
            >
              {link.text}
            </MuiLink>
          ))}
        </Box>
      </BasePageTitle>

      <BaseButton create onClick={() => setCreateDialog(true)} />
      {notifiers && (
        <Box sx={{ mt: 1 }}>
          <BaseExpansionPanels>
            {notifiers.map((notifier, index) => (
              <Accordion
                key={index}
                disableGutters
                sx={{ my: 1, borderRadius: 1, borderLeft: "5px solid", borderLeftColor: "primary.main" }}
              >
                <AccordionSummary
                  sx={{ "& .MuiAccordionSummary-expandIconWrapper.Mui-expanded": { transform: "none" } }}
                  expandIcon={<MdiIcon path={icons.edit} />}
                >
                  <Typography variant="h6" component="div" sx={{ display: "flex", alignItems: "center" }}>
                    {notifier.name}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <TextField
                    fullWidth
                    variant="standard"
                    label={t("general.name")}
                    value={notifier.name}
                    onChange={event => updateNotifier(index, { name: event.target.value })}
                  />
                  <TextField
                    fullWidth
                    variant="standard"
                    label={t("events.apprise-url-skipped-if-blank")}
                    helperText={t("events.apprise-url-is-left-intentionally-blank")}
                    value={notifier.appriseUrl ?? ""}
                    onChange={event => updateNotifier(index, { appriseUrl: event.target.value })}
                    sx={{ mt: 1 }}
                  />
                  <FormControlLabel
                    sx={{ display: "flex" }}
                    control={(
                      <Checkbox
                        size="small"
                        checked={notifier.enabled}
                        onChange={event => updateNotifier(index, { enabled: event.target.checked })}
                      />
                    )}
                    label={t("events.enable-notifier")}
                  />

                  <Divider />
                  <Box component="p" sx={{ pt: 2 }}>
                    {t("events.what-events")}
                  </Box>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                    {optionsSections.map(sec => (
                      <section key={sec.id}>
                        <h4>
                          {sec.text}
                        </h4>
                        {sec.options.map(opt => (
                          <FormControlLabel
                            key={opt.key}
                            sx={{ display: "flex" }}
                            control={(
                              <Checkbox
                                size="small"
                                checked={!!notifier.options[opt.key]}
                                onChange={event => updateNotifier(index, {
                                  options: { ...notifier.options, [opt.key]: event.target.checked },
                                })}
                              />
                            )}
                            label={opt.text}
                          />
                        ))}
                      </section>
                    ))}
                  </Box>
                  <CardActions sx={{ py: 0, justifyContent: "flex-end" }}>
                    <BaseButtonGroup
                      buttons={[
                        {
                          icon: icons.delete,
                          text: t("general.delete"),
                          event: "delete",
                        },
                        {
                          icon: icons.testTube,
                          text: t("general.test"),
                          event: "test",
                        },
                        {
                          icon: icons.save,
                          text: t("general.save"),
                          event: "save",
                        },
                      ]}
                      onAction={(event) => {
                        if (event === "delete") {
                          openDelete(notifier);
                        }
                        else if (event === "save") {
                          void saveNotifier(notifier);
                        }
                        else if (event === "test") {
                          void testNotifier(notifier);
                        }
                      }}
                    />
                  </CardActions>
                </AccordionDetails>
              </Accordion>
            ))}
          </BaseExpansionPanels>
        </Box>
      )}
    </Container>
  );
}
