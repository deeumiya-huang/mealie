import { useRef, useState, type ReactNode } from "react";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import { useNavigate, useParams } from "react-router";
import { RecipeList } from "@/components/Domain/Recipe/RecipeList";
import { MultiPurposeLabelSection } from "@/components/Domain/ShoppingList/MultiPurposeLabelSection";
import { ShoppingListAddItemForm } from "@/components/Domain/ShoppingList/ShoppingListAddItemForm";
import { ShoppingListItem } from "@/components/Domain/ShoppingList/ShoppingListItem";
import { AnimatedChildren, type AnimationSpec } from "@/components/global/Transition/AnimatedChildren";
import { ShoppingListItemEditor } from "@/components/Domain/ShoppingList/ShoppingListItemEditor";
import { BannerWarning } from "@/components/global/BannerWarning";
import { BaseButtonGroup } from "@/components/global/BaseButtonGroup";
import { BaseDialog } from "@/components/global/BaseDialog";
import { BaseExpansionPanels } from "@/components/global/BaseExpansionPanels";
import { BasePageTitle } from "@/components/global/BasePageTitle";
import { ButtonLink } from "@/components/global/ButtonLink";
import { InputLabelType } from "@/components/global/InputLabelType";
import { MdiIcon } from "@/components/global/MdiIcon";
import { WakelockSwitch } from "@/components/global/WakelockSwitch";
import { patchReactive } from "@/hooks/shopping-list-page/state-ref";
import { useShoppingListPage } from "@/hooks/shopping-list-page/use-shopping-list-page";
import { useFoodStore, useLabelStore, useUnitStore } from "@/hooks/store";
import { alert } from "@/hooks/use-toast";
import { useDisplay, usePageTitle } from "@/hooks/utils";
import { moveItem, useSortable } from "@/hooks/utils/use-sortable";
import { useI18n } from "@/i18n";
import type { ShoppingListItemOut, ShoppingListMultiPurposeLabelOut } from "@/lib/api/types/household";
import { icons } from "@/lib/icons";

/** Replaces the item at `index` of a list owned by the shopping list state (the Vue `v-model="value[index]"`). */
function replaceAt(list: ShoppingListItemOut[], index: number, item: ShoppingListItemOut) {
  list[index] = item;
}

interface ReorderLabelsListProps {
  labels: ShoppingListMultiPurposeLabelOut[];
  onReorder: (labels: ShoppingListMultiPurposeLabelOut[]) => void;
}

/** The sortable list of the "reorder labels" dialog; it is mounted together with the dialog content. */
function ReorderLabelsList({ labels, onReorder }: ReorderLabelsListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  useSortable(listRef, {
    handle: ".handle",
    delay: 250,
    delayOnTouchOnly: true,
    onReorder: ({ oldIndex, newIndex }) => onReorder(moveItem(labels, oldIndex, newIndex)),
  });

  return (
    <Box ref={listRef} sx={{ my: 1 }}>
      {labels.map(labelSetting => (
        <div key={labelSetting.id}>
          <MultiPurposeLabelSection labelSetting={labelSetting} useColor />
        </div>
      ))}
    </Box>
  );
}

interface SortableItemsProps {
  items: ShoppingListItemOut[];
  disabled: boolean;
  onStart: () => void;
  onEnd: () => void;
  onReorder: (items: ShoppingListItemOut[]) => void;
  renderItem: (item: ShoppingListItemOut, index: number) => ReactNode;
}

// Vue `<TransitionGroup name="scroll-x-transition">` around the item rows: a row fades in from the left and, when it
// leaves its list (checked off, unchecked, deleted), stays in place while it fades out to the right.
const SCROLL_X_TRANSITION: AnimationSpec = {
  name: "scroll-x-transition",
  enterFrom: "opacity: 0; transform: translateX(-15px);",
  leaveTo: "opacity: 0; transform: translateX(15px);",
};

/** The items of one label: a sortable list whose rows are rendered by `renderItem` (hidden rows return null). */
function SortableItems({ items, disabled, onStart, onEnd, onReorder, renderItem }: SortableItemsProps) {
  const listRef = useRef<HTMLDivElement>(null);
  useSortable(listRef, {
    handle: ".handle",
    delay: 250,
    delayOnTouchOnly: true,
    disabled,
    onStart,
    onEnd,
    onReorder: ({ oldIndex, newIndex }) => onReorder(moveItem(items, oldIndex, newIndex)),
  });

  return (
    <div ref={listRef}>
      <AnimatedChildren animation={SCROLL_X_TRANSITION}>
        {items.map((item, index) => {
          const row = renderItem(item, index);
          return row && <div key={item.id}>{row}</div>;
        })}
      </AnimatedChildren>
    </div>
  );
}

// The page header reserves room for an icon row, a subtitle and generous margins; pull
// those in so the list starts near the top of the screen
const titleSx = {
  "& > div": { mt: "0 !important" },
  "& h2": { fontSize: "1.1rem !important", lineHeight: 1.4 },
  "& h3": { display: "none" },
  "& hr": { mt: "6px !important", mb: "2px !important" },
};

// Strip most of the vertical padding so more items fit on a phone screen, and lean on
// indentation (label header flush left, items inset) to keep sections readable
const viewSx = {
  // each item row
  "& .shopping-list-item-row": { my: "3px !important" },
  "& .shopping-list-item-row .MuiCheckbox-root": { p: 0.5 },
  // the row's action icons are secondary to the item text, so they sit back until used
  "& .shopping-list-item-row .MuiIconButton-sizeSmall": { "width": 32, "height": 32, "ml": "0 !important", "& svg": { opacity: 0.55 } },
  "& .shopping-list-item-row .MuiIconButton-sizeSmall:hover svg, & .shopping-list-item-row .MuiIconButton-sizeSmall:focus-visible svg": { opacity: 1 },
  "& .shopping-list-item-row .mb-2": { mb: "0 !important" },
};

export default function ShoppingListPage() {
  const { smAndUp, smAndDown } = useDisplay();
  const { t } = useI18n();
  const navigate = useNavigate();

  usePageTitle(t("shopping-list.shopping-list"));

  const params = useParams();
  const id = params.id as string;

  const [editingItem, setEditingItem] = useState<string | undefined>(undefined);
  const shoppingListPage = useShoppingListPage(id);
  const { store: allLabels } = useLabelStore();
  const { store: allUnits } = useUnitStore();
  const { store: allFoods } = useFoodStore();

  const {
    shoppingList,
    state,
    checkAll,
    uncheckAll,
    deleteChecked,
    reorderLabelsDialog,
    localLabels,
    saveLabelOrder,
    cancelLabelOrder,
    updateLabelOrder,
    edit,
    threeDot,
    openCheckAll,
    copyListItems,
    toggleReorderLabelsDialog,
    isOffline,
    createEditorOpen,
    createListItemData,
    createListItem,
    itemsByLabel,
    getLabelColor,
    loadingCounter,
    updateIndexUncheckedByLabel,
    recipeMap,
    saveListItem,
    deleteListItem,
    listItems,
    openUncheckAll,
    openDeleteChecked,
    recipeList,
    removeRecipeReferenceToList,
    addRecipeReferenceToList,
    search,
    setSearch,
    isSearching,
    isSearchOpen,
    canSearch,
    toggleSearch,
    matchesSearch,
    hasMatches,
    clearSearch,
    visibleCheckedCount,
    hasSearchResults,
  } = shoppingListPage;

  function itemCheckedToast(item: ShoppingListItemOut) {
    setTimeout(() => {
      alert.info(
        t("shopping-list.item-checked-off", { item: item.food?.name || item.note || t("recipe.ingredient") }),
        null,
        {
          timeout: 4000,
          action: {
            message: t("general.undo"),
            onClick: () => {
              item.checked = false;
              saveListItem(item);
            },
          },
        },
      );
    }, 500);
  }

  // Expand the checked section while searching, so an item that has already been
  // checked off can be found and unchecked without expanding the section by hand.
  const [checkedExpanded, setCheckedExpanded] = useState(false);
  const [wasSearching, setWasSearching] = useState(isSearching);
  if (isSearching !== wasSearching) {
    setWasSearching(isSearching);
    setCheckedExpanded(isSearching);
  }

  function onHeaderAction(event: string) {
    switch (event) {
      case "search":
        toggleSearch();
        break;
      case "edit":
        edit.set(true);
        break;
      case "three-dot":
        threeDot.set(true);
        break;
      case "check":
        openCheckAll();
        break;
      case "copy-plain":
        copyListItems("plain");
        break;
      case "copy-markdown":
        copyListItems("markdown");
        break;
      case "reorder-labels":
        toggleReorderLabelsDialog();
        break;
      case "manage-labels":
        void navigate("/group/data/labels");
        break;
    }
  }

  function renderItemRow(item: ShoppingListItemOut, index: number, list: ShoppingListItemOut[]) {
    if (!matchesSearch(item)) {
      return null;
    }
    return (
      <ShoppingListItem
        key={item.id}
        item={item}
        onChange={updated => replaceAt(list, index, updated)}
        sx={{ my: 1, width: "auto" }}
        edit={editingItem === item.id}
        labels={allLabels}
        units={allUnits}
        foods={allFoods}
        recipes={recipeMap}
        onChecked={(checkedItem) => {
          saveListItem(checkedItem);
          itemCheckedToast(checkedItem);
        }}
        onSave={(savedItem) => {
          setEditingItem(undefined);
          saveListItem(savedItem);
        }}
        onDelete={() => deleteListItem(item)}
        onView={() => setEditingItem(undefined)}
        onEdit={() => setEditingItem(item.id)}
      />
    );
  }

  if (!shoppingList.value) {
    return null;
  }

  const list = shoppingList.value;

  return (
    <Container sx={{ maxWidth: "950px !important" }}>
      <BaseDialog
        open={state.checkAllDialog}
        onOpenChange={open => patchReactive(state, { checkAllDialog: open })}
        bottomSheet
        title={t("general.confirm")}
        icon={icons.checkboxMultipleMarkedOutline}
        canConfirm
        onConfirm={checkAll}
      >
        <Box sx={{ p: 2 }}>
          {t("shopping-list.are-you-sure-you-want-to-check-all-items")}
        </Box>
      </BaseDialog>

      <BaseDialog
        open={state.uncheckAllDialog}
        onOpenChange={open => patchReactive(state, { uncheckAllDialog: open })}
        bottomSheet
        title={t("general.confirm")}
        icon={icons.checkboxMultipleBlankOutline}
        canConfirm
        onConfirm={uncheckAll}
      >
        <Box sx={{ p: 2 }}>
          {t("shopping-list.are-you-sure-you-want-to-uncheck-all-items")}
        </Box>
      </BaseDialog>

      <BaseDialog
        open={state.deleteCheckedDialog}
        onOpenChange={open => patchReactive(state, { deleteCheckedDialog: open })}
        bottomSheet
        title={t("general.confirm")}
        icon={icons.alertCircle}
        canConfirm
        onConfirm={deleteChecked}
      >
        <Box sx={{ p: 2 }}>
          {t("shopping-list.are-you-sure-you-want-to-delete-checked-items")}
        </Box>
      </BaseDialog>

      {/* Reorder Labels */}
      <BaseDialog
        open={reorderLabelsDialog.value}
        onOpenChange={open => reorderLabelsDialog.set(open)}
        icon={icons.tagArrowUp}
        title={t("shopping-list.reorder-labels")}
        submitIcon={icons.save}
        submitText={t("general.save")}
        canSubmit
        onSubmit={() => void saveLabelOrder()}
        onClose={cancelLabelOrder}
      >
        <Box sx={{ height: "fit-content", maxHeight: "70vh", overflowY: "auto" }}>
          {localLabels.value && (
            <ReorderLabelsList labels={localLabels.value} onReorder={updateLabelOrder} />
          )}
        </Box>
      </BaseDialog>

      <Box sx={titleSx}>
        <BasePageTitle
          divider
          header={(
            <Container disableGutters sx={{ px: 0, pt: "4px", pb: 0 }}>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <ButtonLink
                  to="/shopping-lists?disableRedirect=true"
                  text={t("shopping-list.all-lists")}
                  icon={icons.backArrow}
                />
                <Box sx={{ flexGrow: 1 }} />
                {smAndUp && (
                  <Box component="h2" sx={{ m: 0, fontWeight: 400, fontSize: "1.5rem", lineHeight: 1.334 }}>
                    {list.name}
                  </Box>
                )}
                <Box sx={{ flexGrow: 1 }} />
                {/* The search toggle stays while the field is open, so a list that shrinks to the
                    threshold mid-search can still close it. "Check all" would also check items the
                    search is hiding, so it is disabled while searching. */}
                <BaseButtonGroup
                  buttons={[
                    ...(canSearch || isSearchOpen
                      ? [{
                          icon: icons.search,
                          text: t("search.search"),
                          event: "search",
                          color: isSearchOpen ? "primary" : undefined,
                        }]
                      : []),
                    {
                      icon: icons.contentCopy,
                      text: "",
                      event: "edit",
                      children: [
                        {
                          icon: icons.contentCopy,
                          text: t("shopping-list.copy-as-text"),
                          event: "copy-plain",
                        },
                        {
                          icon: icons.contentCopy,
                          text: t("shopping-list.copy-as-markdown"),
                          event: "copy-markdown",
                        },
                      ],
                    },
                    {
                      icon: icons.checkboxMultipleMarkedOutline,
                      text: t("shopping-list.check-all-items"),
                      event: "check",
                      disabled: isSearching,
                    },
                    {
                      icon: icons.dotsVertical,
                      text: "",
                      event: "three-dot",
                      children: [
                        {
                          icon: icons.tags,
                          text: t("shopping-list.reorder-labels"),
                          event: "reorder-labels",
                        },
                        {
                          icon: icons.tags,
                          text: t("shopping-list.manage-labels"),
                          event: "manage-labels",
                        },
                      ],
                    },
                  ]}
                  onAction={onHeaderAction}
                />
              </Box>
            </Container>
          )}
          title={smAndUp ? "" : list.name}
        />
      </Box>
      {isOffline && (
        <BannerWarning
          title={t("shopping-list.you-are-offline")}
          description={t("shopping-list.you-are-offline-description")}
        />
      )}

      {/* Viewer */}
      {!edit.value && (
        <Box component="section" sx={[{ py: 1, display: "flex", flexDirection: "column", gap: 0.5 }, viewSx]}>
          {/* Search, toggled from the page title */}
          {isSearchOpen && (
            <TextField
              value={search}
              onChange={event => setSearch(event.target.value)}
              label={t("search.search")}
              autoFocus
              size="small"
              fullWidth
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <MdiIcon path={icons.search} />
                    </InputAdornment>
                  ),
                  endAdornment: search
                    ? (
                        <InputAdornment position="end">
                          <IconButton size="small" aria-label={t("general.clear")} onClick={clearSearch}>
                            <MdiIcon path={icons.close} size="small" />
                          </IconButton>
                        </InputAdornment>
                      )
                    : undefined,
                },
              }}
            />
          )}

          {/* Create Item */}
          {smAndDown
            ? (
                <ShoppingListAddItemForm
                  listItem={createListItemData}
                  sx={{ my: 2 }}
                  labels={allLabels}
                  units={allUnits}
                  foods={allFoods}
                  onCancel={() => createEditorOpen.set(false)}
                  onSave={createListItem}
                />
              )
            : (
                <Box sx={{ mb: 1.5 }}>
                  {createEditorOpen.value
                    ? (
                        <ShoppingListItemEditor
                          listItem={createListItemData}
                          sx={{ my: 2 }}
                          labels={allLabels}
                          units={allUnits}
                          foods={allFoods}
                          allowDelete={false}
                          onDelete={() => createEditorOpen.set(false)}
                          onCancel={() => createEditorOpen.set(false)}
                          onSave={createListItem}
                        />
                      )
                    : (
                        <InputLabelType
                          items={allFoods}
                          label={t("shopping-list.add-item")}
                          icon={icons.foods}
                          search
                          onFocus={() => createEditorOpen.set(true)}
                        />
                      )}
                </Box>
              )}

          {Object.entries(itemsByLabel.value).map(([key, value]) => hasMatches(value) && (
            <BaseExpansionPanels key={key} startOpen>
              <Accordion disableGutters square sx={{ "boxShadow": "none", "border": "none", "&:before": { display: "none" } }}>
                {/* the label colour fills the header bar; an uncoloured (or unlabelled) header is muted instead */}
                <AccordionSummary
                  sx={{
                    "minHeight": "30px",
                    "py": "2px",
                    "px": "10px",
                    "fontSize": "0.9rem",
                    "fontWeight": 700,
                    "bgcolor": getLabelColor(key),
                    "color": getLabelColor(key) ? undefined : "text.secondary",
                    "& .MuiAccordionSummary-content": { my: "4px" },
                  }}
                  expandIcon={<MdiIcon path={icons.chevronDown} />}
                >
                  {key}
                </AccordionSummary>
                <AccordionDetails sx={{ p: "2px 0 2px 12px" }}>
                  <SortableItems
                    items={value}
                    disabled={isSearching}
                    onStart={() => loadingCounter.set(loadingCounter.value + 1)}
                    onEnd={() => loadingCounter.set(loadingCounter.value - 1)}
                    onReorder={reordered => updateIndexUncheckedByLabel(key, reordered)}
                    renderItem={(item, index) => renderItemRow(item, index, value)}
                  />
                </AccordionDetails>
              </Accordion>
            </BaseExpansionPanels>
          ))}
          {/* Checked Items */}
          {listItems.checked && hasMatches(listItems.checked) && (
            <Accordion
              disableGutters
              elevation={0}
              expanded={checkedExpanded}
              onChange={(_event, expanded) => setCheckedExpanded(expanded)}
              sx={{ "borderRadius": 1, "&:before": { display: "none" } }}
            >
              <AccordionSummary
                // holds buttons of its own, so it cannot be a <button> itself
                component="div"
                sx={{ "py": 0.5, "border": "thin solid", "borderColor": "divider", "& .MuiAccordionSummary-content": { my: 0 } }}
                expandIcon={<MdiIcon path={icons.chevronDown} />}
              >
                <Box sx={{ display: "flex", alignItems: "center", flex: "0 1 100%" }}>
                  <Box sx={{ flex: "1 0 0" }}>
                    {t("shopping-list.items-checked-count", visibleCheckedCount)}
                  </Box>
                  <Box sx={{ justifyContent: "flex-end" }}>
                    {/* both act on every checked item, including any the search is hiding */}
                    <BaseButtonGroup
                      buttons={[
                        {
                          icon: icons.checkboxMultipleBlankOutline,
                          text: t("shopping-list.uncheck-all-items"),
                          event: "uncheck",
                          disabled: isSearching,
                        },
                        {
                          icon: icons.delete,
                          text: t("shopping-list.delete-checked"),
                          event: "delete",
                          disabled: isSearching,
                        },
                      ]}
                      onAction={(event) => {
                        if (event === "uncheck") openUncheckAll();
                        else if (event === "delete") openDeleteChecked();
                      }}
                    />
                  </Box>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ p: "2px 0 2px 12px" }}>
                <AnimatedChildren animation={SCROLL_X_TRANSITION}>
                  {listItems.checked.map((item, idx) => (
                    <div key={item.id} style={matchesSearch(item) ? undefined : { display: "none" }}>
                      <ShoppingListItem
                        item={item}
                        onChange={updated => replaceAt(listItems.checked, idx, updated)}
                        labels={allLabels}
                        units={allUnits}
                        foods={allFoods}
                        onChecked={saveListItem}
                        onSave={saveListItem}
                        onDelete={() => deleteListItem(item)}
                      />
                    </div>
                  ))}
                </AnimatedChildren>
              </AccordionDetails>
            </Accordion>
          )}

          {!hasSearchResults && (
            <Alert severity="info" variant="standard" icon={<MdiIcon path={icons.informationOutline} />} sx={{ py: 0 }}>
              {t("search.no-results")}
            </Alert>
          )}
        </Box>
      )}

      {/* Recipe References */}
      {list.recipeReferences && list.recipeReferences.length > 0 && (
        <Box component="section" sx={{ mt: 3 }}>
          <div>
            <span>
              <MdiIcon path={icons.silverwareForkKnife} sx={{ mr: 1, mb: 0.5 }} />
            </span>
            {t("shopping-list.linked-recipes-count", list.recipeReferences ? list.recipeReferences.length : 0)}
          </div>
          <Divider />
          <RecipeList
            recipes={recipeList}
            showDescription
            disabled={isOffline}
            renderActions={(recipe, index) => (
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <IconButton
                  disabled={isOffline}
                  sx={{ bgcolor: "transparent" }}
                  onClick={(event) => {
                    event.preventDefault();
                    void removeRecipeReferenceToList(recipe.id!);
                  }}
                >
                  <MdiIcon path={icons.minus} sx={{ color: "grey.400" }} />
                </IconButton>
                <Box sx={{ pl: 1.5 }}>
                  {list.recipeReferences?.[index]?.recipeQuantity}
                </Box>
                <IconButton
                  disabled={isOffline}
                  sx={{ bgcolor: "transparent" }}
                  onClick={(event) => {
                    event.preventDefault();
                    void addRecipeReferenceToList(recipe.id!);
                  }}
                >
                  <MdiIcon path={icons.createAlt} sx={{ color: "grey.400" }} />
                </IconButton>
              </Box>
            )}
          />
        </Box>
      )}
      <WakelockSwitch />
    </Container>
  );
}
