import { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import LinearProgress from "@mui/material/LinearProgress";
import Typography from "@mui/material/Typography";
import { AppButtonUpload } from "~/components/global/AppButtonUpload";
import { BaseButton } from "~/components/global/BaseButton";
import { BaseCardSectionTitle } from "~/components/global/BaseCardSectionTitle";
import { BaseContainer } from "~/components/global/BaseContainer";
import { BaseOverflowButton } from "~/components/global/BaseOverflowButton";
import type { MenuItemDef } from "~/components/global/BaseOverflowButton";
import { BasePageTitle, BasePageTitleImage } from "~/components/global/BasePageTitle";
import { BaseTreeView } from "~/components/global/BaseTreeView";
import type { TreeNode } from "~/components/global/BaseTreeView";
import { I18nT } from "~/components/global/I18nT";
import { ReportTable } from "~/components/global/ReportTable";
import { useUserApi } from "~/hooks/api";
import { useDisplay } from "~/hooks/use-display";
import { useI18n } from "~/hooks/use-global-i18n";
import { useSeoMeta } from "~/hooks/use-seo-meta";
import { icons } from "~/lib/icons";
import type { SupportedMigrations } from "~/lib/api/types/group";
import type { ReportSummary } from "~/lib/api/types/reports";

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
} as const;

export default function GroupMigrationsPage() {
  const i18n = useI18n();
  const api = useUserApi();
  const display = useDisplay();

  useSeoMeta({ title: i18n.t("settings.migrations") });

  const [addMigrationTag, setAddMigrationTag] = useState(false);
  const [loading, setLoading] = useState(false);
  const [migrationType, setMigrationType] = useState<SupportedMigrations>(MIGRATIONS.mealie);
  const [fileObject, setFileObject] = useState<File | null>(null);
  const [reports, setReports] = useState<ReportSummary[]>([]);

  const items: MenuItemDef[] = [
    {
      text: i18n.t("migration.mealie-pre-v1.title"),
      value: MIGRATIONS.mealie,
      divider: true,
    },
    {
      text: i18n.t("migration.chowdown.title"),
      value: MIGRATIONS.chowdown,
    },
    {
      text: i18n.t("migration.copymethat.title"),
      value: MIGRATIONS.copymethat,
    },
    {
      text: i18n.t("migration.myrecipebox.title"),
      value: MIGRATIONS.myrecipebox,
    },
    {
      text: i18n.t("migration.nextcloud.title"),
      value: MIGRATIONS.nextcloud,
    },
    {
      text: i18n.t("migration.paprika.title"),
      value: MIGRATIONS.paprika,
    },
    {
      text: i18n.t("migration.plantoeat.title"),
      value: MIGRATIONS.plantoeat,
    },
    {
      text: i18n.t("migration.recipekeeper.title"),
      value: MIGRATIONS.recipekeeper,
    },
    {
      text: i18n.t("migration.tandoor.title"),
      value: MIGRATIONS.tandoor,
    },
    {
      text: i18n.t("migration.cookn.title"),
      value: MIGRATIONS.cookn,
    },
  ];
  const _content: Record<string, MigrationContent> = {
    [MIGRATIONS.mealie]: {
      text: i18n.t("migration.mealie-pre-v1.description-long"),
      acceptedFileType: ".zip",
      tree: [
        {
          icon: icons.zip,
          title: "mealie.zip",
          children: [
            {
              title: "recipes",
              icon: icons.folderOutline,
              children: [
                {
                  title: "recipe-name",
                  icon: icons.folderOutline,
                  children: [
                    { title: "recipe-name.json", icon: icons.codeJson },
                    {
                      title: "images",
                      icon: icons.folderOutline,
                      children: [
                        { title: "original.webp", icon: icons.codeJson },
                        { title: "full.jpg", icon: icons.fileImage },
                        { title: "thumb.jpg", icon: icons.fileImage },
                      ],
                    },
                  ],
                },
                {
                  title: "recipe-name-1",
                  icon: icons.folderOutline,
                  children: [
                    { title: "recipe-name-1.json", icon: icons.codeJson },
                    {
                      title: "images",
                      icon: icons.folderOutline,
                      children: [
                        { title: "original.webp", icon: icons.codeJson },
                        { title: "full.jpg", icon: icons.fileImage },
                        { title: "thumb.jpg", icon: icons.fileImage },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    [MIGRATIONS.chowdown]: {
      text: i18n.t("migration.chowdown.description-long"),
      acceptedFileType: ".zip",
      tree: [
        {
          icon: icons.zip,
          title: "nextcloud.zip",
          children: [
            {
              title: i18n.t("migration.recipe-1"),
              icon: icons.folderOutline,
              children: [
                { title: "recipe.json", icon: icons.codeJson },
                { title: "full.jpg", icon: icons.fileImage },
                { title: "thumb.jpg", icon: icons.fileImage },
              ],
            },
            {
              title: i18n.t("migration.recipe-2"),
              icon: icons.folderOutline,
              children: [
                { title: "recipe.json", icon: icons.codeJson },
                { title: "full.jpg", icon: icons.fileImage },
                { title: "thumb.jpg", icon: icons.fileImage },
              ],
            },
          ],
        },
      ],
    },
    [MIGRATIONS.copymethat]: {
      text: i18n.t("migration.copymethat.description-long"),
      acceptedFileType: ".zip",
      tree: [
        {
          icon: icons.zip,
          title: "Copy_Me_That_20230306.zip",
          children: [
            {
              title: "images",
              icon: icons.folderOutline,
              children: [
                { title: "recipe_1_an5zy.jpg", icon: icons.fileImage },
                { title: "recipe_2_82el8.jpg", icon: icons.fileImage },
                { title: "recipe_3_j75qg.jpg", icon: icons.fileImage },
              ],
            },
            { title: "recipes.html", icon: icons.codeJson },
          ],
        },
      ],
    },
    [MIGRATIONS.myrecipebox]: {
      text: i18n.t("migration.myrecipebox.description-long"),
      acceptedFileType: ".csv",
      tree: false,
    },
    [MIGRATIONS.nextcloud]: {
      text: i18n.t("migration.nextcloud.description-long"),
      acceptedFileType: ".zip",
      tree: [
        {
          icon: icons.zip,
          title: "nextcloud.zip",
          children: [
            {
              title: i18n.t("migration.recipe-1"),
              icon: icons.folderOutline,
              children: [
                { title: "recipe.json", icon: icons.codeJson },
                { title: "full.jpg", icon: icons.fileImage },
                { title: "thumb.jpg", icon: icons.fileImage },
              ],
            },
            {
              title: i18n.t("migration.recipe-2"),
              icon: icons.folderOutline,
              children: [
                { title: "recipe.json", icon: icons.codeJson },
                { title: "full.jpg", icon: icons.fileImage },
                { title: "thumb.jpg", icon: icons.fileImage },
              ],
            },
          ],
        },
      ],
    },
    [MIGRATIONS.paprika]: {
      text: i18n.t("migration.paprika.description-long"),
      acceptedFileType: ".zip",
      tree: false,
    },
    [MIGRATIONS.plantoeat]: {
      text: i18n.t("migration.plantoeat.description-long"),
      acceptedFileType: ".zip,.csv,.txt",
      tree: false,
    },
    [MIGRATIONS.recipekeeper]: {
      text: i18n.t("migration.recipekeeper.description-long"),
      acceptedFileType: ".zip",
      tree: [
        {
          icon: icons.zip,
          title: "recipekeeperhtml.zip",
          children: [
            { title: "recipes.html", icon: icons.codeJson },
            {
              title: "images", icon: icons.folderOutline,
              children: [
                { title: "image1.jpg", icon: icons.fileImage },
                { title: "image2.jpg", icon: icons.fileImage },
              ],
            },
          ],
        },
      ],
    },
    [MIGRATIONS.tandoor]: {
      text: i18n.t("migration.tandoor.description-long"),
      acceptedFileType: ".zip",
      tree: [
        {
          icon: icons.zip,
          title: "tandoor_default_export_full_2023-06-29.zip",
          children: [
            {
              title: "1.zip",
              icon: icons.zip,
              children: [
                { title: "image.jpeg", icon: icons.fileImage },
                { title: "recipe.json", icon: icons.codeJson },
              ],
            },
            {
              title: "2.zip",
              icon: icons.zip,
              children: [
                { title: "image.jpeg", icon: icons.fileImage },
                { title: "recipe.json", icon: icons.codeJson },
              ],
            },
            {
              title: "3.zip",
              icon: icons.zip,
              children: [
                { title: "image.jpeg", icon: icons.fileImage },
                { title: "recipe.json", icon: icons.codeJson },
              ],
            },
          ],
        },
      ],
    },
    [MIGRATIONS.cookn]: {
      text: i18n.t("migration.cookn.description-long"),
      acceptedFileType: ".zip",
      tree: [
        {
          icon: icons.zip,
          title: "cookn.zip",
          children: [
            { title: "temp_brand.dsv", icon: icons.codeJson },
            { title: "temp_chapter_desc.dsv", icon: icons.codeJson },
            { title: "temp_chapter.dsv", icon: icons.codeJson },
            { title: "temp_cookBook_desc.dsv", icon: icons.codeJson },
            { title: "temp_cookBook.dsv", icon: icons.codeJson },
            { title: "temp_food_brand.dsv", icon: icons.codeJson },
            { title: "temp_food_group.dsv", icon: icons.codeJson },
            { title: "temp_food.dsv", icon: icons.codeJson },
            { title: "temp_ingredient.dsv", icon: icons.codeJson },
            { title: "temp_media.dsv", icon: icons.codeJson },
            { title: "temp_nutrient.dsv", icon: icons.codeJson },
            { title: "temp_recipe_desc.dsv", icon: icons.codeJson },
            { title: "temp_recipe.dsv", icon: icons.codeJson },
            { title: "temp_unit_equivalent.dsv", icon: icons.codeJson },
            { title: "temp_unit.dsv", icon: icons.codeJson },
            { title: "images", icon: icons.fileImage },
          ],
        },
      ],
    },
  };

  const content: MigrationContent = useMemo(
    () => _content[migrationType] ?? { text: "", acceptedFileType: ".zip", tree: false },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- _content is rebuilt per render from static data
    [migrationType, i18n.locale],
  );

  async function startMigration() {
    if (!fileObject) return;
    setLoading(true);
    const { data } = await api.groupMigration.startMigration({ addMigrationTag, migrationType, archive: fileObject });
    setLoading(false);
    if (data) {
      setReports(prev => [data, ...prev]);
    }
  }

  async function getMigrationReports() {
    const { data } = await api.groupReports.getAll("migration");
    if (data) {
      setReports(data);
    }
  }

  async function deleteReport(id: string) {
    await api.groupReports.deleteOne(id);
    void getMigrationReports();
  }

  useEffect(() => {
    void getMigrationReports();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- on mount
  }, []);

  const containerSx = display.smAndDown ? { px: 0 } : undefined;

  return (
    <BaseContainer>
      <BasePageTitle
        divider
        header={<Box sx={{ mb: 1 }}><BasePageTitleImage src="/svgs/manage-data-migrations.svg" maxWidth={200} maxHeight={200} /></Box>}
        title={i18n.t("migration.recipe-data-migrations")}
      >
        {i18n.t("migration.recipe-data-migrations-explanation")}
      </BasePageTitle>
      <BaseContainer sx={containerSx}>
        <BaseCardSectionTitle title={i18n.t("migration.new-migration")} />
        <Card variant="outlined" sx={{ borderColor: "lightgrey" }}>
          {loading && <LinearProgress />}
          <Typography variant="h6" sx={{ px: 2, pt: 2 }}>{i18n.t("migration.choose-migration-type")}</Typography>
          <CardContent sx={{ pb: 0 }}>
            <Box sx={{ mb: 1 }}>
              <BaseOverflowButton mode="model" value={migrationType} onChange={v => setMigrationType(v as SupportedMigrations)} items={items} />
            </Box>
            {content.text}
            {content.tree && Array.isArray(content.tree) && <BaseTreeView key={migrationType} items={content.tree} />}
          </CardContent>

          <Typography variant="h6" sx={{ px: 2, mt: 0 }}>{i18n.t("general.upload-file")}</Typography>
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
            {fileObject?.name || i18n.t("migration.no-file-selected")}
          </CardContent>

          <CardContent>
            <FormControlLabel
              control={<Checkbox checked={addMigrationTag} onChange={e => setAddMigrationTag(e.target.checked)} />}
              label={<I18nT keypath="migration.tag-all-recipes" slots={{ "tag-name": <b style={{ margin: "0 4px" }}>{migrationType}</b> }} />}
            />
          </CardContent>

          <Box sx={{ display: "flex", justifyContent: "flex-end", p: 1 }}>
            <BaseButton disabled={!fileObject?.name} onClick={() => void startMigration()}>
              {i18n.t("general.submit")}
            </BaseButton>
          </Box>
        </Card>
      </BaseContainer>
      <BaseContainer sx={containerSx}>
        <BaseCardSectionTitle title={i18n.t("migration.previous-migrations")} />
        <ReportTable items={reports} onDelete={id => void deleteReport(id)} />
      </BaseContainer>
    </BaseContainer>
  );
}
