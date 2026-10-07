import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Link from "@mui/material/Link";
import { Link as RouterLink, Outlet, useLocation, useNavigate, useParams } from "react-router";
import { AdvancedOnly } from "@/components/global/AdvancedOnly";
import { BaseImg } from "@/components/global/BaseImg";
import { BaseOverflowButton, type MenuItemSpec } from "@/components/global/BaseOverflowButton";
import { BasePageTitle } from "@/components/global/BasePageTitle";
import { useGroupSelf } from "@/hooks/use-groups";
import { useMealieAuth } from "@/hooks/use-mealie-auth";
import { usePageTitle } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import { icons } from "@/lib/icons";

// Port of pages/g/[groupSlug]/r/create.vue: parent of every create/* importer (a Nuxt parent rendering <NuxtPage />).
// Middleware ["auth", "group-only"] is the loader guard of the `g/:groupSlug/r/create` route in routes/recipe-create.tsx.
export default function RecipeCreatePage() {
  const { t } = useI18n();
  const auth = useMealieAuth();
  const { group } = useGroupSelf();
  const params = useParams();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();

  usePageTitle(t("general.create"));

  const subpages: MenuItemSpec[] = [
    { icon: icons.link, text: t("recipe.import-with-url"), value: "url" },
    { icon: icons.link, text: t("recipe.bulk-url-import"), value: "bulk" },
    { icon: icons.codeTags, text: t("recipe.import-from-html-or-json"), value: "html" },
    {
      icon: icons.autoFix,
      text: t("recipe.import-with-ai"),
      value: "ai",
      hide: !group?.aiProviderSettings?.aiEnabled,
    },
    { icon: icons.edit, text: t("recipe.create-recipe"), value: "new" },
    { icon: icons.zip, text: t("recipe.import-with-zip"), value: "zip" },
    { icon: icons.robot, text: t("recipe.debug-scraper"), value: "debug" },
  ];

  const groupSlug = params.groupSlug || auth.user?.groupSlug || "";
  const subpage = pathname.split("/").pop() ?? "url";

  function selectSubpage(value: string) {
    void navigate({ pathname: `/g/${groupSlug}/r/create/${value}`, search });
  }

  return (
    <Box>
      <Container sx={{ display: "flex", flexDirection: "column" }}>
        <BasePageTitle
          divider
          header={<BaseImg width="100%" maxHeight="175px" maxWidth="175px" src="/svgs/recipes-create.svg" />}
          title={t("recipe.recipe-creation")}
          content={(
            <Box sx={{ flex: "1 1 auto", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 1 }}>
              <p>{t("recipe.select-one-of-the-various-ways-to-create-a-recipe")}</p>
              <Box sx={{ ml: "auto" }}>
                <BaseOverflowButton
                  mode="model"
                  value={subpage}
                  onChange={selectSubpage}
                  items={subpages}
                  sx={{ borderRadius: 50 }}
                />
              </Box>
            </Box>
          )}
        />
        <section>
          <Outlet />
        </section>
      </Container>

      <AdvancedOnly>
        <Container sx={{ display: "flex", justifyContent: "center", alignItems: "center", my: 2 }}>
          <Link component={RouterLink} to="/group/migrations" color="primary">
            {` ${t("recipe.looking-for-migrations")}`}
          </Link>
        </Container>
      </AdvancedOnly>
    </Box>
  );
}
