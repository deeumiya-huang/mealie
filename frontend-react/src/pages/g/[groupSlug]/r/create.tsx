import { Link as RouterLink, Outlet, useLocation, useNavigate, useParams } from "react-router";
import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import { AdvancedOnly } from "~/components/global/AdvancedOnly";
import { BaseContainer } from "~/components/global/BaseContainer";
import { BaseOverflowButton } from "~/components/global/BaseOverflowButton";
import type { MenuItemDef } from "~/components/global/BaseOverflowButton";
import { BasePageTitle, BasePageTitleImage } from "~/components/global/BasePageTitle";
import { useI18n } from "~/hooks/use-global-i18n";
import { useGroupSelf } from "~/hooks/use-groups";
import { useMealieAuth } from "~/hooks/use-mealie-auth";
import { useSeoMeta } from "~/hooks/use-seo-meta";
import { icons } from "~/lib/icons";

export default function RecipeCreateLayoutPage() {
  const i18n = useI18n();
  const auth = useMealieAuth();
  const { group } = useGroupSelf();
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  useSeoMeta({ title: i18n.t("general.create") });

  const subpages: MenuItemDef[] = [
    { icon: icons.link, text: i18n.t("recipe.import-with-url"), value: "url" },
    { icon: icons.link, text: i18n.t("recipe.bulk-url-import"), value: "bulk" },
    { icon: icons.codeTags, text: i18n.t("recipe.import-from-html-or-json"), value: "html" },
    { icon: icons.autoFix, text: i18n.t("recipe.import-with-ai"), value: "ai", hide: !group?.aiProviderSettings?.aiEnabled },
    { icon: icons.edit, text: i18n.t("recipe.create-recipe"), value: "new" },
    { icon: icons.zip, text: i18n.t("recipe.import-with-zip"), value: "zip" },
    { icon: icons.robot, text: i18n.t("recipe.debug-scraper"), value: "debug" },
  ];

  const groupSlug = params.groupSlug || auth.user?.groupSlug || "";
  const subpage = location.pathname.split("/").pop() ?? "url";
  const setSubpage = (value: string) => void navigate({ pathname: `/g/${groupSlug}/r/create/${value}`, search: location.search });

  return (
    <div>
      <BaseContainer sx={{ display: "flex", flexDirection: "column" }}>
        <BasePageTitle
          divider
          header={<BasePageTitleImage src="/svgs/recipes-create.svg" maxWidth={175} maxHeight={175} />}
          title={i18n.t("recipe.recipe-creation")}
          content={(
            <Box sx={{ flex: "1 1 auto", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 1 }}>
              <p>{i18n.t("recipe.select-one-of-the-various-ways-to-create-a-recipe")}</p>
              <Box sx={{ ml: "auto" }}>
                <BaseOverflowButton value={subpage} onChange={setSubpage} items={subpages} sx={{ borderRadius: 5 }} />
              </Box>
            </Box>
          )}
        />
        <section>
          <Outlet />
        </section>
      </BaseContainer>

      <AdvancedOnly>
        <BaseContainer sx={{ display: "flex", justifyContent: "center", alignItems: "center", my: 2 }}>
          <Link component={RouterLink} to="/group/migrations" color="primary">
            {i18n.t("recipe.looking-for-migrations")}
          </Link>
        </BaseContainer>
      </AdvancedOnly>
    </div>
  );
}
