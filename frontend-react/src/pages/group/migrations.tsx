import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Checkbox from "@mui/material/Checkbox";
import Collapse from "@mui/material/Collapse";
import Container from "@mui/material/Container";
import FormControlLabel from "@mui/material/FormControlLabel";
import LinearProgress from "@mui/material/LinearProgress";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import { AppButtonUpload } from "@/components/global/AppButtonUpload";
import { BaseButton } from "@/components/global/BaseButton";
import { BaseCardSectionTitle } from "@/components/global/BaseCardSectionTitle";
import { BaseImg } from "@/components/global/BaseImg";
import { BaseOverflowButton, type MenuItemSpec } from "@/components/global/BaseOverflowButton";
import { BasePageTitle } from "@/components/global/BasePageTitle";
import { MdiIcon } from "@/components/global/MdiIcon";
import { ReportTable } from "@/components/global/ReportTable";
import { useUserApi } from "@/hooks/api";
import { usePageTitle, useDisplay } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import { I18nT } from "@/i18n/I18nT";
import type { SupportedMigrations } from "@/lib/api/types/group";
import type { ReportSummary } from "@/lib/api/types/reports";
import { icons } from "@/lib/icons";

// Port of pages/group/migrations.vue (middleware ["auth", "advanced-only"] is the loader guard in routes/group.tsx).
interface TreeNode {
  icon: string;
  title: string;
  children?: TreeNode[];
}

interface MigrationContent {
  text: string;
  acceptedFileType: string;
  tree: TreeNode[] | false;
}

const MIGRATIONS = {
  mealie: "mealie_alpha",
  chowdown: "chowdown",
  copymethat: "copymethat",
  myrecipebox: "myrecipebox",
  nextcloud: "nextcloud",
  paprika: "paprika",
  plantoeat: "plantoeat",
  recipekeeper: "recipekeeper",
  tandoor: "tandoor",
  cookn: "cookn",
} satisfies Record<string, SupportedMigrations>;

function node(title: string, icon: string, children?: TreeNode[]): TreeNode {
  return children ? { title, icon, children } : { title, icon };
}

/** A node of the example archive layout; folders expand and collapse (Vue: `v-treeview`, density compact). */
function TreeItem({ item, depth }: { item: TreeNode; depth: number }) {
  const [open, setOpen] = useState(false);
  const hasChildren = !!item.children?.length;

  return (
    <>
      <ListItemButton
        dense
        role="treeitem"
        aria-expanded={hasChildren ? open : undefined}
        disableRipple={!hasChildren}
        sx={{ pl: 1 + depth * 3, py: 0, cursor: hasChildren ? "pointer" : "default" }}
        onClick={() => hasChildren && setOpen(current => !current)}
      >
        <ListItemIcon sx={{ minWidth: 28 }}>
          {hasChildren
            ? <MdiIcon path={icons.chevronRight} size="small" sx={{ transform: open ? "rotate(90deg)" : undefined, transition: "transform 0.2s" }} />
            : null}
        </ListItemIcon>
        <ListItemIcon sx={{ minWidth: 32 }}>
          <MdiIcon path={item.icon} />
        </ListItemIcon>
        <ListItemText primary={item.title} />
      </ListItemButton>
      {hasChildren && (
        <Collapse in={open} timeout="auto" unmountOnExit>
          <List disablePadding dense role="group">
            {item.children?.map((child, index) => (
              <TreeItem key={`${child.title}-${index}`} item={child} depth={depth + 1} />
            ))}
          </List>
        </Collapse>
      )}
    </>
  );
}

export default function GroupMigrationsPage() {
  const { t } = useI18n();
  const { smAndDown } = useDisplay();
  const api = useUserApi();

  usePageTitle(t("settings.migrations"));

  const [addMigrationTag, setAddMigrationTag] = useState(false);
  const [loading, setLoading] = useState(false);
  const [migrationType, setMigrationType] = useState<SupportedMigrations>(MIGRATIONS.mealie);
  const [fileObject, setFileObject] = useState<File | null>(null);
  const [reports, setReports] = useState<ReportSummary[]>([]);

  const items: MenuItemSpec[] = [
    { text: t("migration.mealie-pre-v1.title"), value: MIGRATIONS.mealie, divider: true },
    { text: t("migration.chowdown.title"), value: MIGRATIONS.chowdown },
    { text: t("migration.copymethat.title"), value: MIGRATIONS.copymethat },
    { text: t("migration.myrecipebox.title"), value: MIGRATIONS.myrecipebox },
    { text: t("migration.nextcloud.title"), value: MIGRATIONS.nextcloud },
    { text: t("migration.paprika.title"), value: MIGRATIONS.paprika },
    { text: t("migration.plantoeat.title"), value: MIGRATIONS.plantoeat },
    { text: t("migration.recipekeeper.title"), value: MIGRATIONS.recipekeeper },
    { text: t("migration.tandoor.title"), value: MIGRATIONS.tandoor },
    { text: t("migration.cookn.title"), value: MIGRATIONS.cookn },
  ];

  const recipeFolder = (title: string): TreeNode => node(title, icons.folderOutline, [
    node("recipe.json", icons.codeJson),
    node("full.jpg", icons.fileImage),
    node("thumb.jpg", icons.fileImage),
  ]);

  const mealieRecipe = (name: string): TreeNode => node(name, icons.folderOutline, [
    node(`${name}.json`, icons.codeJson),
    node("images", icons.folderOutline, [
      node("original.webp", icons.codeJson),
      node("full.jpg", icons.fileImage),
      node("thumb.jpg", icons.fileImage),
    ]),
  ]);

  const tandoorRecipe = (name: string): TreeNode => node(name, icons.zip, [
    node("image.jpeg", icons.fileImage),
    node("recipe.json", icons.codeJson),
  ]);

  const cooknFiles = [
    "temp_brand.dsv",
    "temp_chapter_desc.dsv",
    "temp_chapter.dsv",
    "temp_cookBook_desc.dsv",
    "temp_cookBook.dsv",
    "temp_food_brand.dsv",
    "temp_food_group.dsv",
    "temp_food.dsv",
    "temp_ingredient.dsv",
    "temp_media.dsv",
    "temp_nutrient.dsv",
    "temp_recipe_desc.dsv",
    "temp_recipe.dsv",
    "temp_unit_equivalent.dsv",
    "temp_unit.dsv",
  ];

  const migrationContent: Record<string, MigrationContent> = {
    [MIGRATIONS.mealie]: {
      text: t("migration.mealie-pre-v1.description-long"),
      acceptedFileType: ".zip",
      tree: [
        node("mealie.zip", icons.zip, [
          node("recipes", icons.folderOutline, [
            mealieRecipe("recipe-name"),
            mealieRecipe("recipe-name-1"),
          ]),
        ]),
      ],
    },
    [MIGRATIONS.chowdown]: {
      text: t("migration.chowdown.description-long"),
      acceptedFileType: ".zip",
      tree: [
        node("nextcloud.zip", icons.zip, [
          recipeFolder(t("migration.recipe-1")),
          recipeFolder(t("migration.recipe-2")),
        ]),
      ],
    },
    [MIGRATIONS.copymethat]: {
      text: t("migration.copymethat.description-long"),
      acceptedFileType: ".zip",
      tree: [
        node("Copy_Me_That_20230306.zip", icons.zip, [
          node("images", icons.folderOutline, [
            node("recipe_1_an5zy.jpg", icons.fileImage),
            node("recipe_2_82el8.jpg", icons.fileImage),
            node("recipe_3_j75qg.jpg", icons.fileImage),
          ]),
          node("recipes.html", icons.codeJson),
        ]),
      ],
    },
    [MIGRATIONS.myrecipebox]: {
      text: t("migration.myrecipebox.description-long"),
      acceptedFileType: ".csv",
      tree: false,
    },
    [MIGRATIONS.nextcloud]: {
      text: t("migration.nextcloud.description-long"),
      acceptedFileType: ".zip",
      tree: [
        node("nextcloud.zip", icons.zip, [
          recipeFolder(t("migration.recipe-1")),
          recipeFolder(t("migration.recipe-2")),
        ]),
      ],
    },
    [MIGRATIONS.paprika]: {
      text: t("migration.paprika.description-long"),
      acceptedFileType: ".zip",
      tree: false,
    },
    [MIGRATIONS.plantoeat]: {
      text: t("migration.plantoeat.description-long"),
      acceptedFileType: ".zip,.csv,.txt",
      tree: false,
    },
    [MIGRATIONS.recipekeeper]: {
      text: t("migration.recipekeeper.description-long"),
      acceptedFileType: ".zip",
      tree: [
        node("recipekeeperhtml.zip", icons.zip, [
          node("recipes.html", icons.codeJson),
          node("images", icons.folderOutline, [
            node("image1.jpg", icons.fileImage),
            node("image2.jpg", icons.fileImage),
          ]),
        ]),
      ],
    },
    [MIGRATIONS.tandoor]: {
      text: t("migration.tandoor.description-long"),
      acceptedFileType: ".zip",
      tree: [
        node("tandoor_default_export_full_2023-06-29.zip", icons.zip, [
          tandoorRecipe("1.zip"),
          tandoorRecipe("2.zip"),
          tandoorRecipe("3.zip"),
        ]),
      ],
    },
    [MIGRATIONS.cookn]: {
      text: t("migration.cookn.description-long"),
      acceptedFileType: ".zip",
      tree: [
        node("cookn.zip", icons.zip, [
          ...cooknFiles.map(file => node(file, icons.codeJson)),
          node("images", icons.fileImage),
        ]),
      ],
    },
  };

  const content: MigrationContent = migrationContent[migrationType] ?? {
    text: "",
    acceptedFileType: ".zip",
    tree: false,
  };

  async function startMigration() {
    if (!fileObject) {
      return;
    }

    setLoading(true);
    const payload = {
      addMigrationTag,
      migrationType,
      archive: fileObject,
    };

    const { data } = await api.groupMigration.startMigration(payload);

    setLoading(false);

    if (data) {
      setReports(current => [data, ...current]);
    }
  }

  async function deleteReport(id: string) {
    await api.groupReports.deleteOne(id);
    const { data } = await api.groupReports.getAll("migration");

    if (data) {
      setReports(data);
    }
  }

  useEffect(() => {
    let active = true;
    void api.groupReports.getAll("migration").then(({ data }) => {
      if (active && data) {
        setReports(data);
      }
    });
    return () => {
      active = false;
    };
  }, [api]);

  return (
    <Container>
      <BasePageTitle
        divider
        header={<BaseImg width="100%" maxHeight="200px" maxWidth="200px" sx={{ mb: 1 }} src="/svgs/manage-data-migrations.svg" />}
        title={t("migration.recipe-data-migrations")}
      >
        {t("migration.recipe-data-migrations-explanation")}
      </BasePageTitle>
      <Container sx={smAndDown ? { px: 0 } : undefined}>
        <BaseCardSectionTitle title={t("migration.new-migration")} />
        <Card variant="outlined" sx={{ borderColor: "lightgrey", position: "relative" }}>
          {loading && <LinearProgress sx={{ position: "absolute", top: 0, left: 0, right: 0 }} />}
          <CardHeader title={t("migration.choose-migration-type")} slotProps={{ title: { variant: "h6" } }} />
          <CardContent sx={{ pb: 0 }}>
            <Box sx={{ mb: 1 }}>
              <BaseOverflowButton
                mode="model"
                items={items}
                value={migrationType}
                onChange={value => setMigrationType(value as SupportedMigrations)}
              />
            </Box>
            {content.text}
            {content.tree && Array.isArray(content.tree) && (
              <List key={migrationType} dense role="tree">
                {content.tree.map((treeNode, index) => (
                  <TreeItem key={`${treeNode.title}-${index}`} item={treeNode} depth={0} />
                ))}
              </List>
            )}
          </CardContent>

          <CardHeader sx={{ mt: 0 }} title={t("general.upload-file")} slotProps={{ title: { variant: "h6" } }} />
          <CardContent>
            <Box sx={{ mb: 1 }}>
              <AppButtonUpload
                accept={content.acceptedFileType || ".zip"}
                post={false}
                fileName="file"
                textBtn={false}
                onUploaded={file => setFileObject(file as File)}
              />
            </Box>
            {fileObject?.name || t("migration.no-file-selected")}
          </CardContent>

          <CardContent>
            <FormControlLabel
              control={(
                <Checkbox
                  checked={addMigrationTag}
                  onChange={event => setAddMigrationTag(event.target.checked)}
                />
              )}
              label={(
                <I18nT
                  keypath="migration.tag-all-recipes"
                  slots={{ "tag-name": <Box component="b" sx={{ mx: 0.5 }}>{migrationType}</Box> }}
                />
              )}
            />
          </CardContent>

          <CardActions sx={{ justifyContent: "flex-end" }}>
            <BaseButton disabled={!fileObject?.name} onClick={() => void startMigration()}>
              {t("general.submit")}
            </BaseButton>
          </CardActions>
        </Card>
      </Container>
      <Container>
        <BaseCardSectionTitle title={t("migration.previous-migrations")} />
        <ReportTable items={reports} onDelete={id => void deleteReport(id)} />
      </Container>
    </Container>
  );
}
