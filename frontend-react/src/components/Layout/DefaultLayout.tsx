import { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { Link as RouterLink, Outlet, useParams } from "react-router";
import { icons } from "~/lib/icons";
import type { ReadCookBook } from "~/lib/api/types/cookbook";
import type { SideBarLink } from "~/types/application-types";
import { useCookbookStore, usePublicCookbookStore } from "~/hooks/store/use-cookbook-store";
import { useDisplay } from "~/hooks/use-display";
import { useI18n } from "~/hooks/use-global-i18n";
import { useGroupSelf } from "~/hooks/use-groups";
import { useLoggedInState } from "~/hooks/use-logged-in-state";
import { useMealieAuth } from "~/hooks/use-mealie-auth";
import { useCookbookPreferences } from "~/hooks/use-users/preferences";
import { Icon } from "~/components/global/Icon";
import { AppHeader, APP_BAR_HEIGHT } from "./LayoutParts/AppHeader";
import { AppSidebar } from "./LayoutParts/AppSidebar";
import { TheSnackbar } from "./LayoutParts/TheSnackbar";

function OwnCookbooks({ onChange }: { onChange: (cookbooks: ReadCookBook[]) => void }) {
  const { store } = useCookbookStore();
  useEffect(() => onChange(store), [store, onChange]);
  return null;
}

function PublicCookbooks({ groupSlug, onChange }: { groupSlug: string; onChange: (cookbooks: ReadCookBook[]) => void }) {
  const { store } = usePublicCookbookStore(groupSlug);
  useEffect(() => onChange(store), [store, onChange]);
  return null;
}

export function DefaultLayout() {
  const i18n = useI18n();
  const display = useDisplay();
  const auth = useMealieAuth();
  const { isOwnGroup } = useLoggedInState();
  const { group } = useGroupSelf();
  const params = useParams();
  const groupSlug = params.groupSlug || auth.user?.groupSlug || "";
  const [cookbookPreferences] = useCookbookPreferences();
  const [cookbooks, setCookbooks] = useState<ReadCookBook[]>([]);
  const [createAnchor, setCreateAnchor] = useState<HTMLElement | null>(null);
  const showAIImport = group?.aiProviderSettings?.aiEnabled;

  const [sidebar, setSidebar] = useState(false);
  useEffect(() => {
    setSidebar(display.lgAndUp);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- initial state on mount only
  }, []);

  const cookbookAsLink = (cookbook: ReadCookBook): SideBarLink => ({
    key: cookbook.slug || "",
    icon: icons.pages,
    title: cookbook.name,
    to: `/g/${groupSlug}/cookbooks/${cookbook.slug || ""}`,
    restricted: false,
  });

  const currentUserHouseholdId = auth.user?.householdId;
  const cookbookLinks = useMemo<SideBarLink[]>(() => {
    if (!cookbooks?.length) return [];
    const sortedCookbooks = [...cookbooks].sort((a, b) => (a.position || 0) - (b.position || 0));
    const ownLinks: SideBarLink[] = [];
    const links: SideBarLink[] = [];
    const cookbooksByHousehold = sortedCookbooks.reduce((acc, cookbook) => {
      const householdName = cookbook.household?.name || "";
      (acc[householdName] ||= []).push(cookbook);
      return acc;
    }, {} as Record<string, ReadCookBook[]>);

    Object.entries(cookbooksByHousehold).forEach(([householdName, list]) => {
      if (!list.length) return;
      if (list[0]!.householdId === currentUserHouseholdId) {
        ownLinks.push(...list.map(cookbookAsLink));
      }
      else {
        links.push({ key: householdName, icon: icons.book, title: householdName, children: list.map(cookbookAsLink), restricted: false });
      }
    });

    links.sort((a, b) => a.title.localeCompare(b.title));
    if (auth.user && cookbookPreferences.hideOtherHouseholds) return ownLinks;
    return [...ownLinks, ...links];
  // eslint-disable-next-line react-hooks/exhaustive-deps -- cookbookAsLink depends on groupSlug only
  }, [cookbooks, currentUserHouseholdId, cookbookPreferences.hideOtherHouseholds, auth.user, groupSlug]);

  const createLinks = [
    { insertDivider: false, icon: icons.link, title: i18n.t("general.import"), subtitle: i18n.t("new-recipe.import-by-url"), to: `/g/${groupSlug}/r/create/url`, restricted: true, hide: false },
    { insertDivider: false, icon: icons.autoFix, title: i18n.t("recipe.import-with-ai"), subtitle: i18n.t("recipe.import-with-ai-subtitle"), to: `/g/${groupSlug}/r/create/ai`, restricted: true, hide: !showAIImport },
    { insertDivider: true, icon: icons.edit, title: i18n.t("general.create"), subtitle: i18n.t("new-recipe.create-manually"), to: `/g/${groupSlug}/r/create/new`, restricted: true, hide: false },
  ];

  const topLinks: SideBarLink[] = [
    { icon: icons.silverwareForkKnife, to: `/g/${groupSlug}`, title: i18n.t("general.recipes"), restricted: false },
    { icon: icons.search, to: `/g/${groupSlug}/recipes/finder`, title: i18n.t("recipe-finder.recipe-finder"), restricted: false },
    { icon: icons.calendarMultiselect, title: i18n.t("meal-plan.meal-planner"), to: "/household/mealplan/planner/view", restricted: true },
    { icon: icons.formatListCheck, title: i18n.t("shopping-list.shopping-lists"), to: "/shopping-lists", restricted: true },
    { icon: icons.timelineText, title: i18n.t("recipe.timeline"), to: `/g/${groupSlug}/recipes/timeline`, restricted: true },
    { icon: icons.book, to: `/g/${groupSlug}/cookbooks`, title: i18n.t("cookbook.cookbooks"), restricted: true },
    {
      icon: icons.organizers,
      title: i18n.t("general.organizers"),
      restricted: true,
      children: [
        { icon: icons.categories, to: `/g/${groupSlug}/recipes/categories`, title: i18n.t("sidebar.categories"), restricted: true },
        { icon: icons.tags, to: `/g/${groupSlug}/recipes/tags`, title: i18n.t("sidebar.tags"), restricted: true },
        { icon: icons.potSteam, to: `/g/${groupSlug}/recipes/tools`, title: i18n.t("tool.tools"), restricted: true },
      ],
    },
  ];

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <TheSnackbar />
      {isOwnGroup
        ? <OwnCookbooks onChange={setCookbooks} />
        : groupSlug ? <PublicCookbooks groupSlug={groupSlug} onChange={setCookbooks} /> : null}

      <AppHeader>
        <IconButton
          color="inherit"
          onClick={(e) => {
            e.stopPropagation();
            setSidebar(!sidebar);
          }}
        >
          <Icon path={icons.menu} />
        </IconButton>
      </AppHeader>

      <AppSidebar open={sidebar} onOpenChange={setSidebar} topLink={topLinks} secondaryLinks={cookbookLinks || []}>
        {isOwnGroup && (
          <>
            <Button
              size="large"
              variant="contained"
              color="inherit"
              onClick={e => setCreateAnchor(e.currentTarget)}
              startIcon={<Icon path={icons.createAlt} size="large" color="primary" />}
              sx={{ ml: 1, mt: 1.5, borderRadius: 6, boxShadow: 2 }}
            >
              {i18n.t("general.create")}
            </Button>
            <Menu anchorEl={createAnchor} open={!!createAnchor} onClose={() => setCreateAnchor(null)} onClick={() => setCreateAnchor(null)}>
              {createLinks.filter(item => !item.hide).flatMap((item, index) => {
                const nodes = [];
                if (item.insertDivider) nodes.push(<Divider key={`d-${index}`} sx={{ mx: 1 }} />);
                if (!item.restricted || isOwnGroup) {
                  nodes.push(
                    <MenuItem key={item.title} component={RouterLink} to={item.to} sx={{ my: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 56 }}><Icon path={item.icon} size={40} /></ListItemIcon>
                      <ListItemText
                        primary={item.title}
                        secondary={item.subtitle}
                        slotProps={{ primary: { sx: { fontWeight: 500, fontSize: "small" } }, secondary: { sx: { fontWeight: 500, fontSize: "small" } } }}
                      />
                    </MenuItem>,
                  );
                }
                return nodes;
              })}
            </Menu>
          </>
        )}
      </AppSidebar>
      <Box component="main" className="app-main" sx={{ flexGrow: 1, pt: `${APP_BAR_HEIGHT}px`, minWidth: 0 }}>
        <Outlet />
      </Box>
    </Box>
  );
}

export default DefaultLayout;
