import { useCallback, useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Typography from "@mui/material/Typography";
import { BaseButton } from "~/components/global/BaseButton";
import { BaseCardSectionTitle } from "~/components/global/BaseCardSectionTitle";
import { Icon } from "~/components/global/Icon";
import { ReportTable } from "~/components/global/ReportTable";
import { TextInput } from "~/components/global/form";
import { RecipeDialogBulkAdd } from "~/components/Domain/Recipe/RecipeDialogBulkAdd";
import { RecipeOrganizerSelector } from "~/components/Domain/Recipe/RecipeOrganizerSelector";
import { useUserApi } from "~/hooks/api";
import { useI18n } from "~/hooks/use-global-i18n";
import { alert } from "~/hooks/use-toast";
import { icons } from "~/lib/icons";
import type { CreateRecipeBulk, RecipeCategory, RecipeTag } from "~/lib/api/types/recipe";
import type { ReportSummary } from "~/lib/api/types/reports";

type BulkUrl = CreateRecipeBulk & { categories: RecipeCategory[]; tags: RecipeTag[] };

const emptyRow = (url = ""): BulkUrl => ({ url, categories: [], tags: [] });

const selectorInputAttrs = {
  variant: "filled",
  singleLine: true,
  density: "compact",
  hideDetails: true,
  clearable: true,
} as const;

export default function RecipeCreateBulkPage() {
  const api = useUserApi();
  const i18n = useI18n();

  const [showCatTags, setShowCatTags] = useState(false);
  // Rows keep a stable key so focus and selectors survive removing other rows
  const [bulkUrls, setBulkUrls] = useState<(BulkUrl & { key: number })[]>([{ ...emptyRow(), key: 0 }]);
  const [nextKey, setNextKey] = useState(1);
  const [lockBulkImport, setLockBulkImport] = useState(false);

  function updateRow(idx: number, patch: Partial<BulkUrl>) {
    setBulkUrls(prev => prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  }

  function addRows(urls: string[]) {
    setBulkUrls(prev => [...prev, ...urls.map((url, i) => ({ ...emptyRow(url), key: nextKey + i }))]);
    setNextKey(k => k + urls.length);
  }

  // =========================================================
  // Reports

  const [reports, setReports] = useState<ReportSummary[]>([]);

  const fetchReports = useCallback(async () => {
    const { data } = await api.groupReports.getAll("bulk_import");
    setReports(data ?? []);
  }, [api]);

  async function deleteReport(id: string) {
    const { response } = await api.groupReports.deleteOne(id);
    if (response?.status === 200) {
      void fetchReports();
    }
    else {
      alert.error(i18n.t("recipe.report-deletion-failed"));
    }
  }

  useEffect(() => {
    void fetchReports();
  }, [fetchReports]);

  async function bulkCreate() {
    if (bulkUrls.length === 0) {
      return;
    }

    const imports = bulkUrls.map(({ key: _key, ...row }) => row);
    const { response } = await api.recipes.createManyByUrl({ imports });

    if (response?.status === 202) {
      alert.success(i18n.t("recipe.bulk-import-process-has-started"));
      setLockBulkImport(true);
    }
    else {
      alert.error(i18n.t("recipe.bulk-import-process-has-failed"));
    }

    void fetchReports();
  }

  function assignUrls(urls: string[]) {
    if (urls.length === 0) {
      return;
    }
    setBulkUrls(urls.map((url, i) => ({ ...emptyRow(url), key: nextKey + i })));
    setNextKey(k => k + urls.length);
  }

  return (
    <div>
      <Typography variant="h5" sx={{ px: 2, pt: 2 }}>{i18n.t("recipe.recipe-bulk-importer")}</Typography>
      <Box sx={{ p: 2 }}>{i18n.t("recipe.recipe-bulk-importer-description")}</Box>
      <Box sx={{ px: 2 }}>
        <Box component="section" sx={{ mt: 1 }}>
          {bulkUrls.map((row, idx) => (
            <Grid key={row.key} container columnSpacing={2} sx={{ my: 0.5 }}>
              <Grid size={12}>
                <TextInput
                  value={row.url}
                  onChange={url => updateRow(idx, { url })}
                  placeholder={i18n.t("new-recipe.recipe-url")}
                  density="compact"
                  autoFocus
                  variant="solo-filled"
                  hideDetails
                  clearable
                  prependInnerIcon={icons.link}
                  appendInner={(
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setBulkUrls(prev => prev.filter((_, i) => i !== idx))}>
                        <Icon path={icons.delete} />
                      </IconButton>
                    </InputAdornment>
                  )}
                />
              </Grid>
              {showCatTags && (
                <>
                  <Grid size={{ xs: 12, sm: 6 }} sx={{ py: 1 }}>
                    <RecipeOrganizerSelector
                      value={row.categories}
                      onChange={categories => updateRow(idx, { categories })}
                      selectorType="categories"
                      inputAttrs={selectorInputAttrs}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }} sx={{ pt: 1, pb: 2 }}>
                    <RecipeOrganizerSelector
                      value={row.tags}
                      onChange={tags => updateRow(idx, { tags })}
                      selectorType="tags"
                      inputAttrs={selectorInputAttrs}
                    />
                  </Grid>
                </>
              )}
            </Grid>
          ))}
          <Box sx={{ display: "flex", justifyContent: "flex-end", flexWrap: "wrap", alignItems: "center", gap: 1, mt: 1.5 }}>
            <BaseButton
              delete
              onClick={() => {
                setBulkUrls([]);
                setLockBulkImport(false);
              }}
            >
              {i18n.t("general.clear")}
            </BaseButton>
            <Box sx={{ flexGrow: 1 }} />
            <BaseButton color="info" iconSlot={<Icon path={icons.createAlt} />} onClick={() => addRows([""])}>
              {i18n.t("general.new")}
            </BaseButton>
            <RecipeDialogBulkAdd onBulkData={assignUrls} />
          </Box>
          <FormControlLabel
            control={<Checkbox checked={showCatTags} onChange={e => setShowCatTags(e.target.checked)} />}
            label={i18n.t("recipe.set-categories-and-tags")}
          />
          <Box sx={{ display: "flex", justifyContent: "center", p: 1 }}>
            <Box sx={{ width: 250 }}>
              <BaseButton
                text={i18n.t("general.create")}
                disabled={bulkUrls.length === 0 || lockBulkImport}
                fullWidth
                iconSlot={<Icon path={icons.check} />}
                onClick={() => void bulkCreate()}
              />
            </Box>
          </Box>
        </Box>
        <Box component="section" sx={{ mt: 6 }}>
          <BaseCardSectionTitle title={i18n.t("recipe.bulk-imports")} />
          <ReportTable items={reports} onDelete={id => void deleteReport(id)} />
        </Box>
      </Box>
    </div>
  );
}
