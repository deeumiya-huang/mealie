import { Outlet, useLocation } from "react-router";
import Box from "@mui/material/Box";
import Fade from "@mui/material/Fade";
import { BaseContainer } from "~/components/global/BaseContainer";
import { BaseOverflowButton } from "~/components/global/BaseOverflowButton";
import type { MenuItemDef } from "~/components/global/BaseOverflowButton";
import { BasePageTitle, BasePageTitleImage } from "~/components/global/BasePageTitle";
import { useI18n } from "~/hooks/use-global-i18n";
import { useSeoMeta } from "~/hooks/use-seo-meta";

export default function GroupDataLayoutPage() {
  const i18n = useI18n();
  const location = useLocation();

  useSeoMeta({ title: i18n.t("data-pages.data-management") });

  const buttonLookup: Record<string, string> = {
    recipes: i18n.t("general.recipes"),
    recipeActions: i18n.t("recipe.recipe-actions"),
    foods: i18n.t("general.foods"),
    units: i18n.t("general.units"),
    labels: i18n.t("data-pages.labels.labels"),
    categories: i18n.t("category.categories"),
    tags: i18n.t("tag.tags"),
    tools: i18n.t("tool.tools"),
  };

  const DATA_TYPE_OPTIONS: MenuItemDef[] = [
    { text: i18n.t("general.recipes"), value: "new", to: "/group/data/recipes" },
    { text: i18n.t("recipe.recipe-actions"), value: "new", to: "/group/data/recipe-actions", divider: true },
    { text: i18n.t("general.foods"), value: "url", to: "/group/data/foods" },
    { text: i18n.t("general.units"), value: "new", to: "/group/data/units" },
    { text: i18n.t("data-pages.labels.labels"), value: "new", to: "/group/data/labels", divider: true },
    { text: i18n.t("category.categories"), value: "new", to: "/group/data/categories" },
    { text: i18n.t("tag.tags"), value: "new", to: "/group/data/tags" },
    { text: i18n.t("tool.tools"), value: "new", to: "/group/data/tools" },
  ];

  // convert hyphenated-values to camelCase
  const last = location.pathname.split("/").pop()?.replace(/-([a-z])/g, g => g[1]!.toUpperCase());
  const buttonText = (last && buttonLookup[last]) || i18n.t("data-pages.select-data");

  return (
    <BaseContainer>
      <BasePageTitle
        header={<BasePageTitleImage src="/svgs/manage-recipes.svg" maxWidth={175} maxHeight={175} />}
        title={i18n.t("data-pages.data-management")}
        content={(
          <div>
            <BaseOverflowButton btnText={buttonText} mode="link" items={DATA_TYPE_OPTIONS} sx={{ borderRadius: 5 }} />
          </div>
        )}
      >
        {i18n.t("data-pages.data-management-description")}
      </BasePageTitle>
      <section>
        <Fade key={location.pathname} in appear>
          <Box>
            <Outlet />
          </Box>
        </Fade>
      </section>
    </BaseContainer>
  );
}
