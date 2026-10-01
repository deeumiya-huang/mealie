import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import { BannerWarning } from "~/components/global/BannerWarning";
import { BaseButtonGroup } from "~/components/global/BaseButtonGroup";
import { BaseContainer } from "~/components/global/BaseContainer";
import { BaseDialog } from "~/components/global/BaseDialog";
import { BaseExpansionPanels } from "~/components/global/BaseExpansionPanels";
import { BasePageTitle } from "~/components/global/BasePageTitle";
import { ButtonLink } from "~/components/global/ButtonLink";
import { Icon } from "~/components/global/Icon";
import { InputLabelType } from "~/components/global/InputLabelType";
import { SortableList } from "~/components/global/SortableList";
import { WakelockSwitch } from "~/components/global/WakelockSwitch";
import { TextInput } from "~/components/global/form";
import { RecipeList } from "~/components/Domain/Recipe/RecipeList";
import { MultiPurposeLabelSection } from "~/components/Domain/ShoppingList/MultiPurposeLabelSection";
import { ShoppingListAddItemForm } from "~/components/Domain/ShoppingList/ShoppingListAddItemForm";
import { ShoppingListItem } from "~/components/Domain/ShoppingList/ShoppingListItem";
import { ShoppingListItemEditor } from "~/components/Domain/ShoppingList/ShoppingListItemEditor";
import { useShoppingListPage } from "~/hooks/shopping-list-page/use-shopping-list-page";
import { useFoodStore, useLabelStore, useUnitStore } from "~/hooks/store";
import { useDisplay } from "~/hooks/use-display";
import { useI18n } from "~/hooks/use-global-i18n";
import { useSeoMeta } from "~/hooks/use-seo-meta";
import { alert } from "~/hooks/use-toast";
import type { ShoppingListItemOut } from "~/lib/api/types/household";
import { icons } from "~/lib/icons";

/** Background + contrasting text for a label-coloured section header. */
function useHeaderColors() {
  const theme = useTheme();
  return (color: string | null | undefined) => {
    if (!color) return { color: "text.secondary" };
    try {
      return { bgcolor: color, color: theme.palette.getContrastText(color) };
    }
    catch {
      return { bgcolor: color };
    }
  };
}

export default function ShoppingListPage() {
  const params = useParams();
  const id = params.id as string;
  // one controller per list: remount when navigating between lists
  return <ShoppingListView key={id} id={id} />;
}

function ShoppingListView({ id }: { id: string }) {
  const { smAndUp, smAndDown } = useDisplay();
  const i18n = useI18n();
  const navigate = useNavigate();
  const headerColors = useHeaderColors();

  useSeoMeta({ title: i18n.t("shopping-list.shopping-list") });

  const [editingItem, setEditingItem] = useState<string | undefined>(undefined);
  const page = useShoppingListPage(id);
  const { store: allLabels } = useLabelStore();
  const { store: allUnits } = useUnitStore();
  const { store: allFoods } = useFoodStore();

  const {
    state,
    checkAll,
    uncheckAll,
    deleteChecked,
    localLabels,
    saveLabelOrder,
    cancelLabelOrder,
    updateLabelOrder,
    openCheckAll,
    copyListItems,
    toggleReorderLabelsDialog,
    createListItem,
    getLabelColor,
    loadingCounter,
    updateIndexUncheckedByLabel,
    saveListItem,
    deleteListItem,
    listItems,
    openUncheckAll,
    openDeleteChecked,
    removeRecipeReferenceToList,
    addRecipeReferenceToList,
    toggleSearch,
    matchesSearch,
    hasMatches,
    clearSearch,
  } = page;
  const shoppingList = page.shoppingList.value;
  const isOffline = page.isOffline.value;
  const isSearching = page.isSearching.value;
  const isSearchOpen = page.isSearchOpen.value;

  function itemCheckedToast(item: ShoppingListItemOut) {
    setTimeout(() => {
      alert.info(
        i18n.t("shopping-list.item-checked-off", { item: item.food?.name || item.note || i18n.t("recipe.ingredient") }),
        null,
        {
          timeout: 4000,
          action: {
            message: i18n.t("general.undo"),
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
  const [checkedOpen, setCheckedOpen] = useState(false);
  const [prevSearching, setPrevSearching] = useState(isSearching);
  if (prevSearching !== isSearching) {
    setPrevSearching(isSearching);
    setCheckedOpen(isSearching);
  }

  if (!shoppingList) return null;

  const itemProps = {
    labels: allLabels || [],
    units: allUnits || [],
    foods: allFoods || [],
  };

  return (
    <BaseContainer className="md-container">
      <BaseDialog
        open={state.checkAllDialog}
        onOpenChange={open => (state.checkAllDialog = open)}
        bottomSheet
        title={i18n.t("general.confirm")}
        icon={icons.checkboxMultipleMarkedOutline}
        canConfirm
        onConfirm={checkAll}
      >
        <Box sx={{ p: 2 }}>{i18n.t("shopping-list.are-you-sure-you-want-to-check-all-items")}</Box>
      </BaseDialog>

      <BaseDialog
        open={state.uncheckAllDialog}
        onOpenChange={open => (state.uncheckAllDialog = open)}
        bottomSheet
        title={i18n.t("general.confirm")}
        icon={icons.checkboxMultipleBlankOutline}
        canConfirm
        onConfirm={uncheckAll}
      >
        <Box sx={{ p: 2 }}>{i18n.t("shopping-list.are-you-sure-you-want-to-uncheck-all-items")}</Box>
      </BaseDialog>

      <BaseDialog
        open={state.deleteCheckedDialog}
        onOpenChange={open => (state.deleteCheckedDialog = open)}
        bottomSheet
        title={i18n.t("general.confirm")}
        icon={icons.alertCircle}
        canConfirm
        onConfirm={deleteChecked}
      >
        <Box sx={{ p: 2 }}>{i18n.t("shopping-list.are-you-sure-you-want-to-delete-checked-items")}</Box>
      </BaseDialog>

      {/* Reorder Labels */}
      <BaseDialog
        open={page.reorderLabelsDialog.value}
        onOpenChange={open => (page.reorderLabelsDialog.value = open)}
        icon={icons.tagArrowUp}
        title={i18n.t("shopping-list.reorder-labels")}
        submitIcon={icons.save}
        submitText={i18n.t("general.save")}
        canSubmit
        onSubmit={() => void saveLabelOrder()}
        onClose={cancelLabelOrder}
      >
        <Paper sx={{ height: "fit-content", maxHeight: "70vh", overflowY: "auto" }}>
          {localLabels.value && (
            <SortableList
              items={localLabels.value}
              getId={label => label.id}
              onReorder={updateLabelOrder}
              style={{ margin: "8px 0" }}
              renderItem={(labelSetting, _index, handle) => (
                <MultiPurposeLabelSection value={labelSetting} useColor handle={handle} />
              )}
            />
          )}
        </Paper>
      </BaseDialog>

      <BasePageTitle
        divider
        header={(
          <Box sx={{ display: "flex", alignItems: "center", width: "100%", pt: 0.5 }}>
            <ButtonLink to="/shopping-lists?disableRedirect=true" text={i18n.t("shopping-list.all-lists")} icon={icons.backArrow} />
            <Box sx={{ flexGrow: 1 }} />
            {smAndUp && <Typography variant="h5" component="h2" sx={{ fontSize: "1.1rem", lineHeight: 1.4 }}>{shoppingList.name}</Typography>}
            <Box sx={{ flexGrow: 1 }} />
            {/* The search toggle stays while the field is open, so a list that shrinks to the
                threshold mid-search can still close it. "Check all" would also check items the
                search is hiding, so it is disabled while searching. */}
            <BaseButtonGroup
              buttons={[
                ...(page.canSearch.value || isSearchOpen
                  ? [{
                      icon: icons.search,
                      text: i18n.t("search.search"),
                      event: "search",
                      color: isSearchOpen ? "primary" : undefined,
                    }]
                  : []),
                {
                  icon: icons.contentCopy,
                  text: "",
                  event: "edit",
                  children: [
                    { icon: icons.contentCopy, text: i18n.t("shopping-list.copy-as-text"), event: "copy-plain" },
                    { icon: icons.contentCopy, text: i18n.t("shopping-list.copy-as-markdown"), event: "copy-markdown" },
                  ],
                },
                {
                  icon: icons.checkboxMultipleMarkedOutline,
                  text: i18n.t("shopping-list.check-all-items"),
                  event: "check",
                  disabled: isSearching,
                },
                {
                  icon: icons.dotsVertical,
                  text: "",
                  event: "three-dot",
                  children: [
                    { icon: icons.tags, text: i18n.t("shopping-list.reorder-labels"), event: "reorder-labels" },
                    { icon: icons.tags, text: i18n.t("shopping-list.manage-labels"), event: "manage-labels" },
                  ],
                },
              ]}
              onEvent={(event) => {
                switch (event) {
                  case "search": toggleSearch(); break;
                  case "edit": page.edit.value = true; break;
                  case "three-dot": page.threeDot.value = true; break;
                  case "check": openCheckAll(); break;
                  case "copy-plain": copyListItems("plain"); break;
                  case "copy-markdown": copyListItems("markdown"); break;
                  case "reorder-labels": toggleReorderLabelsDialog(); break;
                  case "manage-labels": void navigate("/group/data/labels"); break;
                }
              }}
            />
          </Box>
        )}
        title={smAndUp ? "" : shoppingList.name}
      />
      {isOffline && (
        <BannerWarning
          title={i18n.t("shopping-list.you-are-offline")}
          description={i18n.t("shopping-list.you-are-offline-description")}
        />
      )}

      {/* Viewer */}
      {!page.edit.value && (
        <Box component="section" sx={{ py: 1, display: "flex", flexDirection: "column", gap: 0.5 }}>
          {/* Search, toggled from the page title */}
          {isSearchOpen && (
            <TextInput
              value={page.search.value}
              onChange={value => (value ? (page.search.value = value) : clearSearch())}
              label={i18n.t("search.search")}
              prependInnerIcon={icons.search}
              autoFocus
              clearable
              hideDetails
              density="compact"
              variant="solo"
            />
          )}

          {/* Create Item */}
          {smAndDown
            ? (
                <ShoppingListAddItemForm
                  value={page.createListItemData.value}
                  onChange={item => (page.createListItemData.value = item)}
                  {...itemProps}
                  onCancel={() => (page.createEditorOpen.value = false)}
                  onSave={createListItem}
                />
              )
            : (
                <Box sx={{ mb: 1.5 }}>
                  {page.createEditorOpen.value
                    ? (
                        <ShoppingListItemEditor
                          value={page.createListItemData.value}
                          onChange={item => (page.createListItemData.value = item)}
                          {...itemProps}
                          allowDelete={false}
                          sx={{ my: 2 }}
                          onDelete={() => (page.createEditorOpen.value = false)}
                          onCancel={() => (page.createEditorOpen.value = false)}
                          onSave={createListItem}
                        />
                      )
                    : (
                        <Box onFocus={() => (page.createEditorOpen.value = true)}>
                          <InputLabelType
                            value={null}
                            items={allFoods || []}
                            label={i18n.t("shopping-list.add-item")}
                            icon={icons.foods}
                            search
                          />
                        </Box>
                      )}
                </Box>
              )}

          {Object.entries(page.itemsByLabel.value).map(([key, value]) => hasMatches(value) && (
            <BaseExpansionPanels key={key} startOpen>
              <Accordion disableGutters elevation={0} sx={{ "border": "none", "&:before": { display: "none" } }}>
                {/* the label colour fills the header bar; an uncoloured (or unlabelled) header is muted instead */}
                <AccordionSummary
                  sx={{
                    "minHeight": 30,
                    "px": 1.25,
                    "py": 0.25,
                    "fontSize": "0.9rem",
                    "fontWeight": 700,
                    "borderRadius": 1,
                    ...headerColors(getLabelColor(key)),
                    "& .MuiAccordionSummary-content": { my: 0.25 },
                  }}
                >
                  {key}
                </AccordionSummary>
                <AccordionDetails sx={{ py: 0.25, pr: 0, pl: 1.5 }}>
                  <SortableList
                    items={value}
                    getId={item => item.id}
                    disabled={isSearching}
                    onDragStart={() => (loadingCounter.value += 1)}
                    onDragEnd={() => (loadingCounter.value -= 1)}
                    onReorder={items => updateIndexUncheckedByLabel(key, items)}
                    renderItem={(item, _index, handle) => matchesSearch(item) && (
                      <ShoppingListItem
                        item={item}
                        sx={{ my: "3px" }}
                        edit={editingItem === item.id}
                        {...itemProps}
                        recipes={page.recipeMap.value}
                        handle={handle}
                        onChecked={(updated) => {
                          saveListItem(updated);
                          itemCheckedToast(updated);
                        }}
                        onSave={(updated) => {
                          setEditingItem(undefined);
                          saveListItem(updated);
                        }}
                        onDelete={() => deleteListItem(item)}
                        onView={() => setEditingItem(undefined)}
                        onEdit={() => setEditingItem(item.id)}
                      />
                    )}
                  />
                </AccordionDetails>
              </Accordion>
            </BaseExpansionPanels>
          ))}

          {/* Checked Items */}
          {listItems.checked && hasMatches(listItems.checked) && (
            <Accordion
              expanded={checkedOpen}
              onChange={(_e, open) => setCheckedOpen(open)}
              disableGutters
              elevation={0}
              sx={{ "borderRadius": 1, "&:before": { display: "none" } }}
            >
              <AccordionSummary sx={{ "border": 1, "borderColor": "divider", "borderRadius": 1, "minHeight": 32, "py": 0.25, "& .MuiAccordionSummary-content": { my: 0.25, alignItems: "center" } }}>
                <Box sx={{ flex: "1 0 auto" }}>
                  {i18n.t("shopping-list.items-checked-count", page.visibleCheckedCount.value)}
                </Box>
                {/* both act on every checked item, including any the search is hiding */}
                <Box onClick={e => e.stopPropagation()}>
                  <BaseButtonGroup
                    buttons={[
                      {
                        icon: icons.checkboxMultipleBlankOutline,
                        text: i18n.t("shopping-list.uncheck-all-items"),
                        event: "uncheck",
                        disabled: isSearching,
                      },
                      {
                        icon: icons.delete,
                        text: i18n.t("shopping-list.delete-checked"),
                        event: "delete",
                        disabled: isSearching,
                      },
                    ]}
                    onEvent={event => (event === "uncheck" ? openUncheckAll() : openDeleteChecked())}
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ py: 0.25, pr: 0, pl: 1.5 }}>
                {listItems.checked.map(item => (
                  <Box key={item.id} sx={{ display: matchesSearch(item) ? undefined : "none" }}>
                    <ShoppingListItem
                      item={item}
                      sx={{ my: "3px" }}
                      {...itemProps}
                      onChecked={saveListItem}
                      onSave={saveListItem}
                      onDelete={() => deleteListItem(item)}
                    />
                  </Box>
                ))}
              </AccordionDetails>
            </Accordion>
          )}

          {!page.hasSearchResults.value && (
            <Alert severity="info" variant="outlined" sx={{ py: 0 }}>
              {i18n.t("search.no-results")}
            </Alert>
          )}
        </Box>
      )}

      {/* Recipe References */}
      {shoppingList.recipeReferences && shoppingList.recipeReferences.length > 0 && (
        <Box component="section" sx={{ mt: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Icon path={icons.silverwareForkKnife} start />
            {i18n.t("shopping-list.linked-recipes-count", shoppingList.recipeReferences.length)}
          </Box>
          <Divider />
          <RecipeList
            recipes={page.recipeList.value}
            showDescription
            disabled={isOffline}
            renderActions={(recipe) => {
              const index = page.recipeList.value.indexOf(recipe);
              return (
                <Box sx={{ display: "flex", alignItems: "center" }} onClick={e => e.preventDefault()}>
                  <IconButton
                    disabled={isOffline}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      void removeRecipeReferenceToList(recipe.id!);
                    }}
                  >
                    <Icon path={icons.minus} sx={{ color: "grey.400" }} />
                  </IconButton>
                  <Box sx={{ pl: 1.5 }}>
                    {shoppingList.recipeReferences![index]?.recipeQuantity}
                  </Box>
                  <IconButton
                    disabled={isOffline}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      void addRecipeReferenceToList(recipe.id!);
                    }}
                  >
                    <Icon path={icons.createAlt} sx={{ color: "grey.400" }} />
                  </IconButton>
                </Box>
              );
            }}
          />
        </Box>
      )}
      <WakelockSwitch />
    </BaseContainer>
  );
}
