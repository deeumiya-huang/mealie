import { useEffect, useRef, useState } from "react";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { BaseButton } from "~/components/global/BaseButton";
import { BaseButtonGroup } from "~/components/global/BaseButtonGroup";
import { BaseContainer } from "~/components/global/BaseContainer";
import { BaseDialog } from "~/components/global/BaseDialog";
import { BasePageTitle, BasePageTitleImage } from "~/components/global/BasePageTitle";
import { Icon } from "~/components/global/Icon";
import { SortableList } from "~/components/global/SortableList";
import { CookbookEditor } from "~/components/Domain/Cookbook/CookbookEditor";
import { useCookbookStore } from "~/hooks/store";
import { useI18n } from "~/hooks/use-global-i18n";
import { useHouseholdSelf } from "~/hooks/use-households";
import { useMealieAuth } from "~/hooks/use-mealie-auth";
import { useSeoMeta } from "~/hooks/use-seo-meta";
import { useCookbookPreferences } from "~/hooks/use-users/preferences";
import { icons } from "~/lib/icons";
import type { CreateCookBook, ReadCookBook } from "~/lib/api/types/cookbook";

export default function CookbooksPage() {
  const i18n = useI18n();
  const auth = useMealieAuth();
  const { store: allCookbooks, actions, updateAll } = useCookbookStore();
  const { household } = useHouseholdSelf();
  const [cookbookPreferences, setCookbookPreferences] = useCookbookPreferences();

  useSeoMeta({ title: i18n.t("cookbook.cookbooks") });

  const [createDialog, setCreateDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Make a local copy of this household's cookbooks
  const householdId = auth.user?.householdId;
  const [myCookbooks, setMyCookbooks] = useState<ReadCookBook[]>([]);
  useEffect(() => {
    setMyCookbooks(
      allCookbooks
        .filter(cookbook => cookbook.householdId === householdId)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    );
  }, [allCookbooks, householdId]);

  function updateCookbook(id: string, update: (prev: ReadCookBook) => ReadCookBook) {
    setMyCookbooks(prev => prev.map(c => (c.id === id ? update(c) : c)));
  }

  // create
  const [createTargetKey, setCreateTargetKey] = useState(0);
  const [createTarget, setCreateTarget] = useState<ReadCookBook | null>(null);
  async function createCookbook() {
    const name = i18n.t("cookbook.household-cookbook-name", [
      household?.name || "",
      String((myCookbooks.length ?? 0) + 1),
    ]);

    const cookbook = await actions.createOne({ name } as CreateCookBook as ReadCookBook);
    if (cookbook) {
      // the store refresh after creating may already have added it
      setMyCookbooks(prev => (prev.some(c => c.id === cookbook.id) ? prev : [...prev, cookbook]));
      setCreateTarget(cookbook);
      setCreateTargetKey(k => k + 1);
    }
    setCreateDialog(true);
  }

  // delete
  const [deleteTarget, setDeleteTarget] = useState<ReadCookBook | null>(null);
  function deleteEventHandler(item: ReadCookBook) {
    setDeleteTarget(item);
    setDeleteDialog(true);
  }
  async function deleteCookbook() {
    if (!deleteTarget) {
      return;
    }
    await actions.deleteOne(deleteTarget.id);
    setMyCookbooks(prev => prev.filter(c => c.id !== deleteTarget.id));
    setDeleteDialog(false);
    setDeleteTarget(null);
  }

  async function deleteCreateTarget() {
    if (!createTarget?.id) {
      return;
    }
    const id = createTarget.id;
    await actions.deleteOne(id);
    setMyCookbooks(prev => prev.filter(c => c.id !== id));
    setCreateDialog(false);
    setCreateTarget(null);
  }

  // A cookbook created but never given a filter is removed when leaving the page
  const createTargetRef = useRef(createTarget);
  createTargetRef.current = createTarget;
  useEffect(() => {
    function handleUnmount() {
      const target = createTargetRef.current;
      if (!target?.id || target.queryFilterString) {
        return;
      }
      void actions.deleteOne(target.id);
    }
    window.addEventListener("beforeunload", handleUnmount);
    return () => {
      handleUnmount();
      window.removeEventListener("beforeunload", handleUnmount);
    };
  }, [actions]);

  return (
    <div>
      {/* Create Dialog */}
      {createTarget && (
        <BaseDialog
          open={createDialog}
          onOpenChange={setCreateDialog}
          width="100%"
          maxWidth="1100px"
          icon={icons.pages}
          title={i18n.t("cookbook.create-a-cookbook")}
          submitIcon={icons.save}
          submitText={i18n.t("general.save")}
          submitDisabled={!createTarget.queryFilterString}
          canSubmit
          onSubmit={() => {
            const target = createTarget;
            void actions.updateOne(target).then(() => setCreateTarget(null));
          }}
          onCancel={() => void deleteCreateTarget()}
        >
          <Box sx={{ px: 2 }}>
            <CookbookEditor
              key={createTargetKey}
              value={createTarget}
              onChange={update => setCreateTarget(prev => (prev ? update(prev) : prev))}
            />
          </Box>
        </BaseDialog>
      )}

      {/* Delete Dialog */}
      <BaseDialog
        open={deleteDialog}
        onOpenChange={setDeleteDialog}
        bottomSheet
        title={i18n.t("general.delete-with-name", { name: i18n.t("cookbook.cookbook") })}
        icon={icons.alertCircle}
        color="error"
        canConfirm
        onConfirm={() => void deleteCookbook()}
      >
        <Box sx={{ px: 2, pb: 2 }}>
          <p>{i18n.t("general.confirm-delete-generic-with-name", { name: i18n.t("cookbook.cookbook") })}</p>
          {deleteTarget && <p style={{ margin: "16px 0 0 16px" }}>{deleteTarget.name}</p>}
        </Box>
      </BaseDialog>

      {/* Page Title */}
      <BaseContainer>
        <BasePageTitle
          divider
          header={<BasePageTitleImage src="/svgs/manage-cookbooks.svg" maxWidth={100} maxHeight={100} />}
          title={i18n.t("cookbook.cookbooks")}
        >
          {i18n.t("cookbook.description")}
        </BasePageTitle>

        <Box sx={{ my: 3 }}>
          <FormControlLabel
            control={(
              <Checkbox
                checked={cookbookPreferences.hideOtherHouseholds}
                onChange={e => setCookbookPreferences({ ...cookbookPreferences, hideOtherHouseholds: e.target.checked })}
              />
            )}
            label={i18n.t("cookbook.hide-cookbooks-from-other-households")}
          />
          <Box sx={{ ml: 4 }}>
            <Typography variant="subtitle2" sx={{ my: 0, py: 0 }}>
              {i18n.t("cookbook.hide-cookbooks-from-other-households-description")}
            </Typography>
          </Box>
        </Box>

        {/* Create New */}
        <BaseButton create onClick={() => void createCookbook()} />

        {/* Cookbook List */}
        <Box sx={{ mt: 1 }}>
          <SortableList
            items={myCookbooks}
            getId={cookbook => cookbook.id}
            onReorder={(items) => {
              setMyCookbooks(items);
              void updateAll(items);
            }}
            renderItem={(cookbook, _index, handle) => (
              <Accordion
                expanded={expanded === cookbook.id}
                onChange={(_, open) => setExpanded(open ? cookbook.id : null)}
                className="left-border"
                sx={{ my: 1, borderRadius: 1, "&:before": { display: "none" } }}
                slotProps={{ transition: { unmountOnExit: true } }}
              >
                <AccordionSummary sx={{ "& .MuiAccordionSummary-content": { alignItems: "center", my: 1 } }}>
                  <Typography variant="h6" sx={{ display: "flex", alignItems: "center", opacity: 0.8, flexGrow: 1 }}>
                    <Icon path={icons.pages} size="large" start />
                    {cookbook.name}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <IconButton sx={{ ml: 1 }}>
                      <Icon path={icons.edit} />
                    </IconButton>
                    <Box
                      ref={handle.ref}
                      {...handle.attributes}
                      {...handle.listeners}
                      onClick={e => e.stopPropagation()}
                      sx={{ display: "flex", cursor: "move", touchAction: "none" }}
                    >
                      <Icon path={icons.arrowUpDown} size={40} />
                    </Box>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <CookbookEditor value={cookbook} onChange={update => updateCookbook(cookbook.id, update)} />
                  <Box sx={{ display: "flex", justifyContent: "flex-end", p: 1 }}>
                    <BaseButtonGroup
                      buttons={[
                        { icon: icons.delete, text: i18n.t("general.delete"), event: "delete" },
                        { icon: icons.save, text: i18n.t("general.save"), event: "save", disabled: !cookbook.queryFilterString },
                      ]}
                      onEvent={(event) => {
                        if (event === "delete") deleteEventHandler(cookbook);
                        if (event === "save") void actions.updateOne(cookbook);
                      }}
                    />
                  </Box>
                </AccordionDetails>
              </Accordion>
            )}
          />
        </Box>
      </BaseContainer>
    </div>
  );
}
