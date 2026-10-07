import { useEffect, useRef, useState } from "react";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Checkbox from "@mui/material/Checkbox";
import Container from "@mui/material/Container";
import FormControlLabel from "@mui/material/FormControlLabel";
import Typography from "@mui/material/Typography";
import { CookbookEditor } from "@/components/Domain/Cookbook/CookbookEditor";
import { BaseButton } from "@/components/global/BaseButton";
import { BaseButtonGroup } from "@/components/global/BaseButtonGroup";
import { BaseDialog } from "@/components/global/BaseDialog";
import { BaseImg } from "@/components/global/BaseImg";
import { BasePageTitle } from "@/components/global/BasePageTitle";
import { MdiIcon } from "@/components/global/MdiIcon";
import { useCookbookStore } from "@/hooks/store/use-cookbook-store";
import { useHouseholdSelf } from "@/hooks/use-households";
import { useMealieAuth } from "@/hooks/use-mealie-auth";
import { useCookbookPreferences } from "@/hooks/use-users/preferences";
import { usePageTitle } from "@/hooks/utils";
import { useSortableList } from "@/hooks/utils/use-sortable";
import { useI18n } from "@/i18n";
import type { ReadCookBook } from "@/lib/api/types/cookbook";
import { icons } from "@/lib/icons";

// The cookbooks of the user's own household, in position order.
function ownCookbooks(all: ReadCookBook[], householdId: string | undefined) {
  return all
    .filter(cookbook => cookbook.householdId === householdId)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}

/**
 * Vue kept a local copy of the household's cookbooks (edited in place by the forms) that was rebuilt whenever the
 * store array was replaced (after an update or delete refreshes it). `createOne` only appends to the store array,
 * so the copy there was left alone: here an unchanged cookbook object keeps its local edits and order, a changed
 * one takes the stored version, removed ones go and new ones are appended.
 */
function mergeCookbooks(local: ReadCookBook[], all: ReadCookBook[], previousAll: ReadCookBook[], householdId: string | undefined) {
  const stored = new Map(ownCookbooks(all, householdId).map(cookbook => [cookbook.id, cookbook]));
  const previous = new Map(previousAll.map(cookbook => [cookbook.id, cookbook]));
  const merged: ReadCookBook[] = [];
  for (const cookbook of local) {
    const current = stored.get(cookbook.id);
    if (current) {
      merged.push(previous.get(cookbook.id) === current ? cookbook : current);
      stored.delete(cookbook.id);
    }
  }
  return [...merged, ...stored.values()];
}

export default function CookbooksPage() {
  const { t } = useI18n();
  const auth = useMealieAuth();
  const householdId = auth.user?.householdId;

  // Set page title
  usePageTitle(t("cookbook.cookbooks"));

  const { store: allCookbooks, actions, updateAll } = useCookbookStore();

  // Make a local copy of myCookbooks
  const [myCookbooks, setMyCookbooks] = useState<ReadCookBook[]>(() => ownCookbooks(allCookbooks, householdId));
  const [previousAll, setPreviousAll] = useState(allCookbooks);
  const [previousHousehold, setPreviousHousehold] = useState(householdId);
  if (allCookbooks !== previousAll || householdId !== previousHousehold) {
    setPreviousAll(allCookbooks);
    setPreviousHousehold(householdId);
    setMyCookbooks(
      householdId === previousHousehold
        ? mergeCookbooks(myCookbooks, allCookbooks, previousAll, householdId)
        : ownCookbooks(allCookbooks, householdId),
    );
  }

  const { household } = useHouseholdSelf();
  const [cookbookPreferences, setCookbookPreferences] = useCookbookPreferences();

  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  // like Vuetify's lazy panel text: a panel's form is built when it is first opened and then kept
  const [opened, setOpened] = useState<ReadonlySet<string>>(new Set());

  function replaceCookbook(cookbook: ReadCookBook) {
    setMyCookbooks(current => current.map(item => (item.id === cookbook.id ? cookbook : item)));
  }

  // create
  const [createTargetKey, setCreateTargetKey] = useState(0);
  const [createTarget, setCreateTarget] = useState<ReadCookBook | null>(null);
  async function createCookbook() {
    const name = t("cookbook.household-cookbook-name", [
      household?.name || "",
      String(myCookbooks.length + 1),
    ]);

    const cookbook = await actions.createOne({ name } as ReadCookBook);
    if (cookbook) {
      setCreateTarget(cookbook);
      setCreateTargetKey(key => key + 1);
    }
    setCreateOpen(true);
  }

  // delete
  const [deleteTarget, setDeleteTarget] = useState<ReadCookBook | null>(null);
  function deleteEventHandler(item: ReadCookBook) {
    setDeleteTarget(item);
    setDeleteOpen(true);
  }
  async function deleteCookbook() {
    if (!deleteTarget) {
      return;
    }
    await actions.deleteOne(deleteTarget.id);
    setMyCookbooks(current => current.filter(c => c.id !== deleteTarget.id));
    setDeleteOpen(false);
    setDeleteTarget(null);
  }

  async function deleteCreateTarget() {
    if (!createTarget?.id) {
      return;
    }
    await actions.deleteOne(createTarget.id);
    setMyCookbooks(current => current.filter(c => c.id !== createTarget.id));
    setCreateOpen(false);
    setCreateTarget(null);
  }

  // A cookbook created but never given a filter is removed again when the page is left.
  const pending = useRef({ createTarget, deleteCreateTarget });
  useEffect(() => {
    pending.current = { createTarget, deleteCreateTarget };
  });
  useEffect(() => {
    function handleUnmount() {
      const current = pending.current;
      if (!current.createTarget?.id || current.createTarget.queryFilterString) {
        return;
      }
      void current.deleteCreateTarget();
    }
    window.addEventListener("beforeunload", handleUnmount);
    return () => {
      handleUnmount();
      window.removeEventListener("beforeunload", handleUnmount);
    };
  }, []);

  const listRef = useRef<HTMLDivElement>(null);
  useSortableList(
    listRef,
    myCookbooks,
    (list) => {
      setMyCookbooks(list);
      void updateAll(list);
    },
    { handle: ".handle", delay: 250, delayOnTouchOnly: true },
  );

  return (
    <div>
      {/* Create Dialog */}
      {createTarget && (
        <BaseDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          width="100%"
          maxWidth="1100px"
          icon={icons.pages}
          title={t("cookbook.create-a-cookbook")}
          submitIcon={icons.save}
          submitText={t("general.save")}
          submitDisabled={!createTarget.queryFilterString}
          canSubmit
          onSubmit={() => void actions.updateOne(createTarget)}
          onCancel={() => void deleteCreateTarget()}
        >
          <CardContent>
            <CookbookEditor key={createTargetKey} value={createTarget} onChange={setCreateTarget} />
          </CardContent>
        </BaseDialog>
      )}

      {/* Delete Dialog */}
      <BaseDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        bottomSheet
        title={t("general.delete-with-name", { name: t("cookbook.cookbook") })}
        icon={icons.alertCircle}
        color="error"
        canConfirm
        onConfirm={() => void deleteCookbook()}
      >
        <CardContent>
          <Typography>{t("general.confirm-delete-generic-with-name", { name: t("cookbook.cookbook") })}</Typography>
          {deleteTarget && (
            <Typography sx={{ mt: 2, ml: 2 }}>
              {deleteTarget.name}
            </Typography>
          )}
        </CardContent>
      </BaseDialog>

      {/* Cookbook Page */}
      {/* Page Title */}
      <Container sx={{ maxWidth: "1100px !important" }}>
        <BasePageTitle
          divider
          header={<BaseImg width="100%" maxHeight={100} maxWidth={100} src="/svgs/manage-cookbooks.svg" />}
          title={t("cookbook.cookbooks")}
        >
          {t("cookbook.description")}
        </BasePageTitle>

        <Box sx={{ my: 3 }}>
          <FormControlLabel
            control={(
              <Checkbox
                color="primary"
                checked={cookbookPreferences.hideOtherHouseholds}
                onChange={event => setCookbookPreferences({ ...cookbookPreferences, hideOtherHouseholds: event.target.checked })}
              />
            )}
            label={t("cookbook.hide-cookbooks-from-other-households")}
          />
          <Box sx={{ ml: 5, mt: -1.5 }}>
            <Typography variant="subtitle2" sx={{ my: 0, py: 0 }}>
              {t("cookbook.hide-cookbooks-from-other-households-description")}
            </Typography>
          </Box>
        </Box>

        {/* Create New */}
        <BaseButton create onClick={() => void createCookbook()} />

        {/* Cookbook List */}
        <Box sx={{ mt: 1 }}>
          <Box ref={listRef} sx={{ width: "100%" }}>
            {myCookbooks.map(cookbook => (
              <Accordion
                key={cookbook.id}
                expanded={expanded === cookbook.id}
                onChange={(_event, isExpanded) => {
                  setExpanded(isExpanded ? cookbook.id : null);
                  if (isExpanded) {
                    setOpened(current => new Set(current).add(cookbook.id));
                  }
                }}
                disableGutters
                sx={{ my: 1, borderLeft: "5px solid", borderLeftColor: "primary.main", borderRadius: 1 }}
              >
                <AccordionSummary
                  expandIcon={(
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <Box sx={{ display: "flex", ml: 1, mr: 1, p: 1 }} aria-hidden="true">
                        <MdiIcon path={icons.edit} />
                      </Box>
                      <MdiIcon className="handle" path={icons.arrowUpDown} sx={{ fontSize: 40, cursor: "grab" }} />
                    </Box>
                  )}
                  sx={{
                    "& .MuiAccordionSummary-expandIconWrapper.Mui-expanded": { transform: "none" },
                    "opacity": 0.8,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <MdiIcon path={icons.pages} size="large" sx={{ mr: 1 }} />
                    <Typography variant="h6" component="span">
                      {cookbook.name}
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  {opened.has(cookbook.id) && <CookbookEditor value={cookbook} onChange={replaceCookbook} />}
                  <CardActions>
                    <Box sx={{ flexGrow: 1 }} />
                    <BaseButtonGroup
                      buttons={[
                        {
                          icon: icons.delete,
                          text: t("general.delete"),
                          event: "delete",
                        },
                        {
                          icon: icons.save,
                          text: t("general.save"),
                          event: "save",
                          disabled: !cookbook.queryFilterString,
                        },
                      ]}
                      onAction={(event) => {
                        if (event === "delete") {
                          deleteEventHandler(cookbook);
                        }
                        else if (event === "save") {
                          void actions.updateOne(cookbook);
                        }
                      }}
                    />
                  </CardActions>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        </Box>
      </Container>
    </div>
  );
}
