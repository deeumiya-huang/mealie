import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link as RouterLink, useParams } from "react-router";
import Fuse from "fuse.js";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { BaseButton } from "~/components/global/BaseButton";
import { BaseCardSectionTitle } from "~/components/global/BaseCardSectionTitle";
import { BaseDialog } from "~/components/global/BaseDialog";
import { ContextMenu } from "~/components/global/ContextMenu";
import { Icon } from "~/components/global/Icon";
import { useContextPresets } from "~/hooks/use-context-presents";
import { useI18n } from "~/hooks/use-global-i18n";
import { useMealieAuth } from "~/hooks/use-mealie-auth";
import { useRouteQuery } from "~/hooks/use-router";
import { deepCopy } from "~/hooks/use-utils";
import { icons } from "~/lib/icons";
import { Organizer } from "~/lib/api/types/non-generated";
import type { RecipeOrganizer } from "~/lib/api/types/non-generated";
import { RecipeOrganizerDialog } from "./RecipeOrganizerDialog";

export interface GenericItem {
  id: string;
  name: string;
  slug: string;
  onHand: boolean;
}

export interface RecipeOrganizerPageProps<T extends GenericItem> {
  items: T[];
  icon: string;
  itemType: RecipeOrganizer;
  title: ReactNode;
  onUpdate: (item: T) => void;
  onDelete: (id: string) => void;
}

const FUSE_OPTIONS = {
  ignoreLocation: true,
  shouldSort: true,
  threshold: 0.2,
  location: 0,
  distance: 20,
  findAllMatches: true,
  minMatchCharLength: 1,
  keys: ["name"],
};

const TRANSLATION_KEYS: Partial<Record<RecipeOrganizer, string>> = {
  categories: "category.category",
  tags: "tag.tag",
  tools: "tool.tool",
  foods: "shopping-list.food",
  households: "household.household",
};

export function RecipeOrganizerPage<T extends GenericItem>({ items, icon, itemType, title, onUpdate, onDelete }: RecipeOrganizerPageProps<T>) {
  const i18n = useI18n();
  const auth = useMealieAuth();
  const params = useParams();
  const groupSlug = params.groupSlug || auth.user?.groupSlug || "";
  const presets = useContextPresets();

  const [organizerDialog, setOrganizerDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [updateDialog, setUpdateDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);
  const [updateTarget, setUpdateTarget] = useState<T | null>(null);

  const translationKey = TRANSLATION_KEYS[itemType] || "";

  // ================================================================
  // Search

  const [searchString, setSearchString] = useRouteQuery("q", "");
  const fuse = useMemo(() => new Fuse(items, FUSE_OPTIONS), [items]);

  const itemsSorted = useMemo(() => {
    const fuzzyItems = searchString.trim() === "" ? items : fuse.search(searchString.trim()).map(x => x.item);
    const byLetter: Record<string, T[]> = {};
    [...fuzzyItems]
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((item) => {
        const letter = item.name[0].toUpperCase();
        (byLetter[letter] ??= []).push(item);
      });
    return byLetter;
  }, [items, fuse, searchString]);

  function onMenuEvent(item: T, event: string) {
    if (event === "delete") {
      setDeleteTarget(item);
      setDeleteDialog(true);
    }
    else if (event === "edit") {
      setUpdateTarget(deepCopy(item));
      setUpdateDialog(true);
    }
  }

  return (
    <div>
      <RecipeOrganizerDialog open={organizerDialog} onOpenChange={setOrganizerDialog} itemType={itemType} />

      {deleteTarget && (
        <BaseDialog
          open={deleteDialog}
          onOpenChange={setDeleteDialog}
          bottomSheet
          title={i18n.t("general.delete-with-name", { name: i18n.t(translationKey) })}
          color="error"
          icon={icons.alertCircle}
          canConfirm
          onConfirm={() => onDelete(deleteTarget.id)}
        >
          <Box sx={{ px: 2, pb: 2 }}>
            <p>{i18n.t("general.confirm-delete-generic-with-name", { name: i18n.t(translationKey) })}</p>
            <p style={{ margin: "16px 0 0 16px" }}>{deleteTarget.name}</p>
          </Box>
        </BaseDialog>
      )}

      {updateTarget && (
        <BaseDialog
          open={updateDialog}
          onOpenChange={setUpdateDialog}
          title={i18n.t("general.update")}
          icon={icons.edit}
          canConfirm
          onConfirm={() => onUpdate(updateTarget)}
        >
          <Box sx={{ px: 2, pb: 2 }}>
            <TextField
              fullWidth
              variant="standard"
              value={updateTarget.name}
              label={i18n.t("general.name")}
              onChange={e => setUpdateTarget({ ...updateTarget, name: e.target.value })}
            />
            {itemType === Organizer.Tool && (
              <FormControlLabel
                control={(
                  <Checkbox
                    checked={updateTarget.onHand}
                    onChange={e => setUpdateTarget({ ...updateTarget, onHand: e.target.checked })}
                  />
                )}
                label={i18n.t("tool.on-hand")}
              />
            )}
          </Box>
        </BaseDialog>
      )}

      <TextField
        fullWidth
        autoFocus
        value={searchString}
        placeholder={i18n.t("search.search-placeholder")}
        onChange={e => setSearchString(e.target.value || null)}
        sx={{ mb: 2 }}
        slotProps={{
          input: {
            startAdornment: <InputAdornment position="start"><Icon path={icons.search} /></InputAdornment>,
            endAdornment: searchString
              ? (
                  <InputAdornment position="end">
                    <IconButton size="small" edge="end" aria-label={i18n.t("general.clear")} onClick={() => setSearchString(null)}>
                      <Icon path={icons.close} />
                    </IconButton>
                  </InputAdornment>
                )
              : undefined,
          },
        }}
      />

      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <Icon path={icon} size="large" />
        <Typography variant="h5" component="div" sx={{ flexGrow: 1 }}>{title}</Typography>
        <BaseButton create onClick={() => setOrganizerDialog(true)} />
      </Box>

      {Object.entries(itemsSorted).map(([key, itms], idx) => (
        <Box component="section" key={"header" + idx} sx={idx === 1 ? undefined : { my: 2 }}>
          {key.length === 1 && <BaseCardSectionTitle title={key} />}
          <Grid container spacing={2}>
            {itms.map(item => (
              <Grid key={item.id} size={{ xs: 12, md: 6, lg: 4, xl: 3 }}>
                <Card className="left-border" sx={{ display: "flex", alignItems: "center", pr: 1 }}>
                  <CardActionArea
                    component={RouterLink}
                    to={`/g/${groupSlug}?${itemType}=${item.id}`}
                    sx={{ display: "flex", alignItems: "center", gap: 1, p: 1, flex: "1 1 auto", minWidth: 0 }}
                  >
                    <Icon path={icon} />
                    <Typography variant="h6" noWrap sx={{ flex: "1 1 auto", minWidth: 0 }}>{item.name}</Typography>
                  </CardActionArea>
                  {/* Kept outside the link so menu clicks (which bubble through the portal) don't navigate */}
                  <ContextMenu items={[presets.delete, presets.edit]} onEvent={e => onMenuEvent(item, e)} />
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      ))}
    </div>
  );
}

export default RecipeOrganizerPage;
