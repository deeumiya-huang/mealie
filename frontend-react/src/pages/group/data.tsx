import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import { Outlet, useLocation } from "react-router";
import { BaseImg } from "@/components/global/BaseImg";
import { BaseOverflowButton, type MenuItemSpec } from "@/components/global/BaseOverflowButton";
import { BasePageTitle } from "@/components/global/BasePageTitle";
import { usePageTitle } from "@/hooks/utils";
import { useI18n } from "@/i18n";

// Port of pages/group/data.vue: parent of every data/* page (a Nuxt parent rendering <NuxtPage />).
// Middleware ["auth", "can-organize-only"] is the loader guard of the `group/data` route in routes/group.tsx.
export default function GroupDataPage() {
  const { t } = useI18n();
  const { pathname } = useLocation();

  const buttonLookup: Record<string, string> = {
    recipes: t("general.recipes"),
    recipeActions: t("recipe.recipe-actions"),
    foods: t("general.foods"),
    units: t("general.units"),
    labels: t("data-pages.labels.labels"),
    categories: t("category.categories"),
    tags: t("tag.tags"),
    tools: t("tool.tools"),
  };

  const DATA_TYPE_OPTIONS: MenuItemSpec[] = [
    { text: t("general.recipes"), value: "new", to: "/group/data/recipes" },
    { text: t("recipe.recipe-actions"), value: "new", to: "/group/data/recipe-actions", divider: true },
    { text: t("general.foods"), value: "url", to: "/group/data/foods" },
    { text: t("general.units"), value: "new", to: "/group/data/units" },
    { text: t("data-pages.labels.labels"), value: "new", to: "/group/data/labels", divider: true },
    { text: t("category.categories"), value: "new", to: "/group/data/categories" },
    { text: t("tag.tags"), value: "new", to: "/group/data/tags" },
    { text: t("tool.tools"), value: "new", to: "/group/data/tools" },
  ];

  // convert hypenated-values to camelCase
  const last = pathname
    .split("/")
    .pop()
    ?.replace(/-([a-z])/g, g => g[1].toUpperCase());

  const buttonText = last ? buttonLookup[last] : t("data-pages.select-data");

  usePageTitle(t("data-pages.data-management"));

  return (
    <Container>
      <BasePageTitle
        header={<BaseImg width="100%" maxHeight="175px" maxWidth="175px" src="/svgs/manage-recipes.svg" />}
        title={t("data-pages.data-management")}
        content={(
          <Box>
            <BaseOverflowButton btnText={buttonText} mode="link" items={DATA_TYPE_OPTIONS} sx={{ borderRadius: 50 }} />
          </Box>
        )}
      >
        {t("data-pages.data-management-description")}
      </BasePageTitle>
      <section>
        <Box>
          <Outlet />
        </Box>
      </section>
    </Container>
  );
}
