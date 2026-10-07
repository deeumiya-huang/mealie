import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import CardActions from "@mui/material/CardActions";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import { BaseButton } from "@/components/global/BaseButton";
import { BaseCardSectionTitle } from "@/components/global/BaseCardSectionTitle";
import { MdiIcon } from "@/components/global/MdiIcon";
import { ReportTable } from "@/components/global/ReportTable";
import { RecipeDialogBulkAdd } from "@/components/Domain/Recipe/RecipeDialogBulkAdd";
import { RecipeOrganizerSelector } from "@/components/Domain/Recipe/RecipeOrganizerSelector";
import { RecipeCreateOption, RecipeCreateText, RecipeCreateTextField, RecipeCreateTitle } from "@/components/Domain/Recipe/RecipeCreate/RecipeCreateParts";
import { useUserApi } from "@/hooks/api";
import { alert } from "@/hooks/use-toast";
import { uuid4 } from "@/hooks/use-utils";
import { useI18n } from "@/i18n";
import type { CreateRecipeBulk, RecipeCategory, RecipeTag } from "@/lib/api/types/recipe";
import { Organizer } from "@/lib/api/types/non-generated";
import type { ReportSummary } from "@/lib/api/types/reports";
import { icons } from "@/lib/icons";

const organizerInputAttrs = {
  variant: "filled",
  singleLine: true,
  density: "compact",
  rounded: true,
  className: "rounded-lg",
  hideDetails: true,
  clearable: true,
} as const;

// Each row carries a stable React key (not sent to the API), so deleting a row does not shift the child
// components' state (e.g. organizer search text) onto the next row.
type BulkRow = CreateRecipeBulk & { rowKey: string };

function emptyImport(): BulkRow {
  return { url: "", categories: [], tags: [], rowKey: uuid4() };
}

// Port of pages/g/[groupSlug]/r/create/bulk.vue: import many recipes from a list of URLs, then follow the reports.
export default function RecipeCreateBulkPage() {
  const { t } = useI18n();
  const api = useUserApi();

  const [showCatTags, setShowCatTags] = useState(false);
  const [bulkUrls, setBulkUrls] = useState<BulkRow[]>(() => [emptyImport()]);
  const [lockBulkImport, setLockBulkImport] = useState(false);
  const [reports, setReports] = useState<ReportSummary[]>([]);

  function updateImport(index: number, patch: Partial<CreateRecipeBulk>) {
    setBulkUrls(current => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  }

  async function fetchReports() {
    const { data } = await api.groupReports.getAll("bulk_import");
    setReports(data ?? []);
  }

  async function bulkCreate() {
    if (bulkUrls.length === 0) {
      return;
    }

    const { response } = await api.recipes.createManyByUrl({ imports: bulkUrls.map(({ rowKey: _rowKey, ...item }) => item) });

    if (response?.status === 202) {
      alert.success(t("recipe.bulk-import-process-has-started"));
      setLockBulkImport(true);
    }
    else {
      alert.error(t("recipe.bulk-import-process-has-failed"));
    }

    await fetchReports();
  }

  async function deleteReport(id: string) {
    const { response } = await api.groupReports.deleteOne(id);

    if (response?.status === 200) {
      await fetchReports();
    }
    else {
      alert.error(t("recipe.report-deletion-failed"));
    }
  }

  // Load the reports on mount (the Vue setup called fetchReports()).
  useEffect(() => {
    let active = true;
    void api.groupReports.getAll("bulk_import").then(({ data }) => {
      if (active) {
        setReports(data ?? []);
      }
    });
    return () => {
      active = false;
    };
  }, [api]);

  function assignUrls(urls: string[]) {
    if (urls.length === 0) {
      return;
    }

    setBulkUrls(urls.map(url => ({ url, categories: [], tags: [], rowKey: uuid4() })));
  }

  return (
    <Box>
      <Box>
        <RecipeCreateTitle>{t("recipe.recipe-bulk-importer")}</RecipeCreateTitle>
        <RecipeCreateText>{t("recipe.recipe-bulk-importer-description")}</RecipeCreateText>
        <Box sx={{ px: 2 }}>
          <Box component="section" sx={{ mt: 1 }}>
            {bulkUrls.map((item, idx) => (
              <Grid key={item.rowKey} container spacing={1} sx={{ my: 0.5 }}>
                <Grid size={12}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box sx={{ flexGrow: 1 }}>
                      <RecipeCreateTextField
                        label={t("new-recipe.recipe-url")}
                        icon={icons.link}
                        dense
                        autoFocus
                        value={item.url}
                        onChange={url => updateImport(idx, { url })}
                      />
                    </Box>
                    <IconButton
                      size="small"
                      aria-label={t("general.delete")}
                      onClick={() => setBulkUrls(current => current.filter((_, itemIndex) => itemIndex !== idx))}
                    >
                      <MdiIcon path={icons.delete} />
                    </IconButton>
                  </Box>
                </Grid>
                {showCatTags && (
                  <>
                    <Grid size={{ xs: 12, sm: 6 }} sx={{ py: 0 }}>
                      <RecipeOrganizerSelector
                        selectorType={Organizer.Category}
                        value={item.categories as RecipeCategory[] | undefined}
                        onChange={categories => updateImport(idx, { categories })}
                        inputAttrs={organizerInputAttrs}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }} sx={{ pt: 0, pb: 2 }}>
                      <RecipeOrganizerSelector
                        selectorType={Organizer.Tag}
                        value={item.tags as RecipeTag[] | undefined}
                        onChange={tags => updateImport(idx, { tags })}
                        inputAttrs={organizerInputAttrs}
                      />
                    </Grid>
                  </>
                )}
              </Grid>
            ))}
            <CardActions sx={{ justifyContent: "flex-end", flexWrap: "wrap", mt: 1.5, p: 0 }}>
              <BaseButton
                delete
                sx={{ mt: 0.5, pr: 2 }}
                onClick={() => {
                  setBulkUrls([]);
                  setLockBulkImport(false);
                }}
              >
                {t("general.clear")}
              </BaseButton>
              <Box sx={{ flexGrow: 1 }} />
              <BaseButton
                color="info"
                icon={icons.createAlt}
                sx={{ mr: 0.5, mb: 0.5 }}
                onClick={() => setBulkUrls(current => [...current, emptyImport()])}
              >
                {t("general.new")}
              </BaseButton>
              <Box sx={{ mb: 0.5 }}>
                <RecipeDialogBulkAdd onBulkData={assignUrls} />
              </Box>
            </CardActions>
            <Box>
              <RecipeCreateOption
                label={t("recipe.set-categories-and-tags")}
                checked={showCatTags}
                onChange={setShowCatTags}
              />
            </Box>
            <CardActions sx={{ justifyContent: "center" }}>
              <Box sx={{ width: 250 }}>
                <BaseButton
                  text={t("general.create")}
                  icon={icons.check}
                  disabled={bulkUrls.length === 0 || lockBulkImport}
                  fullWidth
                  sx={{ borderRadius: "24px" }}
                  onClick={() => void bulkCreate()}
                />
              </Box>
            </CardActions>
          </Box>
          <Box component="section" sx={{ mt: 6 }}>
            <BaseCardSectionTitle title={t("recipe.bulk-imports")} />
            <ReportTable items={reports} onDelete={id => void deleteReport(id)} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
