// Usage: <RecipeOrganizerPage items={tags} icon={icons.tags} itemType="tags" title={t("tag.tags")}
//          onDelete={id => …} onUpdate={item => …} />
// The organizer page body (categories / tags / tools): fuzzy search (kept in the `q` query parameter), the items
// grouped under their first letter as cards linking to the filtered explorer, plus create / rename / delete dialogs.
// Vue's `#title` slot is the `title` prop; `@update` / `@delete` are `onUpdate` / `onDelete`.
import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Fuse from "fuse.js";
import { Link, useParams } from "react-router";
import { BaseButton } from "@/components/global/BaseButton";
import { BaseCardSectionTitle } from "@/components/global/BaseCardSectionTitle";
import { BaseDialog } from "@/components/global/BaseDialog";
import { ContextMenu } from "@/components/global/ContextMenu";
import { MdiIcon } from "@/components/global/MdiIcon";
import { useContextPresets } from "@/hooks/use-context-presents";
import { useMealieAuth } from "@/hooks/use-mealie-auth";
import { useRouteQuery } from "@/hooks/use-router";
import { deepCopy } from "@/hooks/use-utils";
import { useI18n } from "@/i18n";
import { Organizer, type RecipeOrganizer } from "@/lib/api/types/non-generated";
import { icons } from "@/lib/icons";
import { RecipeOrganizerDialog } from "./RecipeOrganizerDialog";

export interface GenericItem {
  id?: string | null;
  name: string;
  slug: string;
  onHand?: boolean;
}

interface RecipeOrganizerPageProps<T extends GenericItem> {
  items: T[];
  icon: string;
  itemType: RecipeOrganizer;
  title?: string;
  onUpdate?: (item: T) => void;
  onDelete?: (id: string) => void;
}

// Search Options
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

function isTitle(key: string) {
  return key.length === 1;
}

export function RecipeOrganizerPage<T extends GenericItem>({ items, icon, itemType, title, onUpdate, onDelete }: RecipeOrganizerPageProps<T>) {
  const { t } = useI18n();
  const auth = useMealieAuth();
  const params = useParams();
  const groupSlug = params.groupSlug || auth.user?.groupSlug || "";
  const presets = useContextPresets();

  // =================================================================
  // Context Menu

  const [organizerOpen, setOrganizerOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);
  const [updateTarget, setUpdateTarget] = useState<T | null>(null);

  const translationKey = TRANSLATION_KEYS[itemType] || "";

  function confirmDelete(item: T) {
    setDeleteTarget(item);
    setDeleteOpen(true);
  }

  function deleteOne() {
    if (!deleteTarget) {
      return;
    }

    onDelete?.(deleteTarget.id as string);
  }

  function openUpdateDialog(item: T) {
    setUpdateTarget(deepCopy(item));
    setUpdateOpen(true);
  }

  function updateOne() {
    if (!updateTarget) {
      return;
    }

    onUpdate?.(updateTarget);
  }

  // ================================================================
  // Search Functions

  const [searchValue, setSearchString] = useRouteQuery<string>("q", "");
  const searchString = searchValue ?? "";

  const fuse = useMemo(() => new Fuse(items, FUSE_OPTIONS), [items]);

  const fuzzyItems = useMemo<T[]>(() => {
    if (searchString.trim() === "") {
      return items;
    }
    return fuse.search(searchString.trim()).map(x => x.item);
  }, [fuse, items, searchString]);

  // =================================================================
  // Sorted Items

  const itemsSorted = useMemo(() => {
    const byLetter: Record<string, T[]> = {};

    [...fuzzyItems]
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((item) => {
        const letter = item.name[0].toUpperCase();
        if (!byLetter[letter]) {
          byLetter[letter] = [];
        }
        byLetter[letter].push(item);
      });

    return byLetter;
  }, [fuzzyItems]);

  // JS objects list integer-like keys ("1", "2") first in ascending order, exactly like the Vue `v-for` over them.
  const sections = Object.entries(itemsSorted);

  return (
    <div>
      <RecipeOrganizerDialog open={organizerOpen} onOpenChange={setOrganizerOpen} itemType={itemType} />

      {deleteTarget && (
        <BaseDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          bottomSheet
          title={t("general.delete-with-name", { name: t(translationKey) })}
          color="error"
          icon={icons.alertCircle}
          canConfirm
          onConfirm={deleteOne}
        >
          <CardContent>
            <Typography>{t("general.confirm-delete-generic-with-name", { name: t(translationKey) })}</Typography>
            <Typography sx={{ mt: 2, mb: 0, ml: 2 }}>
              {deleteTarget.name}
            </Typography>
          </CardContent>
        </BaseDialog>
      )}

      {updateTarget && (
        <BaseDialog
          open={updateOpen}
          onOpenChange={setUpdateOpen}
          title={t("general.update")}
          icon={icons.edit}
          canConfirm
          onConfirm={updateOne}
        >
          <CardContent>
            <TextField
              fullWidth
              value={updateTarget.name}
              label={t("general.name")}
              onChange={event => setUpdateTarget({ ...updateTarget, name: event.target.value })}
            />
            {itemType === Organizer.Tool && (
              <FormControlLabel
                control={(
                  <Checkbox
                    checked={!!updateTarget.onHand}
                    onChange={event => setUpdateTarget({ ...updateTarget, onHand: event.target.checked })}
                  />
                )}
                label={t("tool.on-hand")}
              />
            )}
          </CardContent>
        </BaseDialog>
      )}

      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          variant="outlined"
          autoFocus
          value={searchString}
          onChange={event => setSearchString(event.target.value)}
          placeholder={t("search.search-placeholder")}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <MdiIcon path={icons.search} />
                </InputAdornment>
              ),
              endAdornment: searchString
                ? (
                    <InputAdornment position="end">
                      <IconButton size="small" edge="end" aria-label={t("general.clear")} onClick={() => setSearchString("")}>
                        <MdiIcon path={icons.close} size="small" />
                      </IconButton>
                    </InputAdornment>
                  )
                : undefined,
            },
          }}
        />
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", width: "100%", mt: -0.5, borderRadius: 1 }}>
        <MdiIcon path={icon} size="large" sx={{ mr: 1 }} />
        <Typography variant="h5" component="div">
          {title}
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <BaseButton create onClick={() => setOrganizerOpen(true)} />
      </Box>

      {sections.map(([key, itms], idx) => (
        <Box component="section" key={`header${idx}`} sx={idx === 1 ? undefined : { my: 2 }}>
          {isTitle(key) && <BaseCardSectionTitle title={key} />}
          <Grid container spacing={2}>
            {itms.map((item, index) => (
              <Grid key={`cat${index}`} size={{ xs: 12, sm: 12, md: 6, lg: 4, xl: 3 }}>
                <Card
                  component={Link}
                  to={`/g/${groupSlug}?${itemType}=${item.id}`}
                  sx={{
                    "display": "block",
                    "color": "inherit",
                    "textDecoration": "none",
                    "borderLeft": "5px solid",
                    "borderLeftColor": "primary.main",
                    "&:hover": { boxShadow: 4 },
                  }}
                >
                  <CardActions sx={{ minWidth: 0 }}>
                    <MdiIcon path={icon} />
                    <Typography
                      variant="h6"
                      component="div"
                      noWrap
                      sx={{ py: 0.5, px: 1, flexGrow: 1, flexShrink: 1, minWidth: 0 }}
                    >
                      {item.name}
                    </Typography>
                    {/* the menu lives in a portal whose events bubble through React to the card's link */}
                    <Box
                      component="span"
                      onClick={event => event.stopPropagation()}
                    >
                      <ContextMenu
                        items={[presets.delete, presets.edit]}
                        onAction={(event) => {
                          if (event === "delete") {
                            confirmDelete(item);
                          }
                          else if (event === "edit") {
                            openUpdateDialog(item);
                          }
                        }}
                      />
                    </Box>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      ))}
    </div>
  );
}
