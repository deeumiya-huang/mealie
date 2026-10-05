// The default layout: header, sidebar (recipes/planner/… links, the group's cookbooks, the "Create" menu)
// and the page (`<Outlet />`). Used by layouts/DefaultLayout.
import { useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { Link, Outlet, useParams } from "react-router";
import { AppHeader, APP_HEADER_HEIGHT } from "@/components/Layout/LayoutParts/AppHeader";
import { AppSidebar } from "@/components/Layout/LayoutParts/AppSidebar";
import { TheSnackbar } from "@/components/Layout/LayoutParts/TheSnackbar";
import { MdiIcon } from "@/components/global/MdiIcon";
import { useCookbookStore, usePublicCookbookStore } from "@/hooks/store";
import { useGroupSelf } from "@/hooks/use-groups";
import { useLoggedInState } from "@/hooks/use-logged-in-state";
import { useMealieAuth } from "@/hooks/use-mealie-auth";
import { useCookbookPreferences } from "@/hooks/use-users/preferences";
import { useDisplay } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import type { ReadCookBook } from "@/lib/api/types/cookbook";
import { icons } from "@/lib/icons";
import type { SideBarLink } from "@/types/application-types";

type CookbooksRender = (cookbooks: ReadCookBook[]) => ReactNode;

// Vue picked the own or the public cookbook store in a computed; hooks can't be called conditionally,
// so each source is a component and the layout renders the one that applies.
function OwnCookbooks({ children }: { children: CookbooksRender }) {
  const { store } = useCookbookStore();
  return children(store);
}

function PublicCookbooks({ groupSlug, children }: { groupSlug: string; children: CookbooksRender }) {
  const { store } = usePublicCookbookStore(groupSlug);
  return children(store);
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

  const showAIImport = group?.aiProviderSettings?.aiEnabled;

  // Open by default on large screens (Vue: set in onMounted)
  const [sidebar, setSidebar] = useState<boolean>(display.lgAndUp);
  const [createMenuAnchor, setCreateMenuAnchor] = useState<HTMLElement | null>(null);

  function cookbookAsLink(cookbook: ReadCookBook): SideBarLink {
    return {
      key: cookbook.slug || "",
      icon: icons.pages,
      title: cookbook.name,
      to: `/g/${groupSlug}/cookbooks/${cookbook.slug || ""}`,
      restricted: false,
    };
  }

  const currentUserHouseholdId = auth.user?.householdId;
  function cookbookLinks(cookbooks: ReadCookBook[]): SideBarLink[] {
    if (!cookbooks?.length) {
      return [];
    }

    const sortedCookbooks = [...cookbooks].sort((a, b) => (a.position || 0) - (b.position || 0));

    const ownLinks: SideBarLink[] = [];
    const links: SideBarLink[] = [];
    const cookbooksByHousehold = sortedCookbooks.reduce((acc, cookbook) => {
      const householdName = cookbook.household?.name || "";
      (acc[householdName] ||= []).push(cookbook);
      return acc;
    }, {} as Record<string, ReadCookBook[]>);

    Object.entries(cookbooksByHousehold).forEach(([householdName, cookbooks]) => {
      if (!cookbooks.length) {
        return;
      }
      if (cookbooks[0].householdId === currentUserHouseholdId) {
        ownLinks.push(...cookbooks.map(cookbookAsLink));
      }
      else {
        links.push({
          key: householdName,
          icon: icons.book,
          title: householdName,
          children: cookbooks.map(cookbookAsLink),
          restricted: false,
        });
      }
    });

    links.sort((a, b) => a.title.localeCompare(b.title));
    if (auth.user && cookbookPreferences.hideOtherHouseholds) {
      return ownLinks;
    }
    else {
      return [...ownLinks, ...links];
    }
  }

  const createLinks = [
    {
      insertDivider: false,
      icon: icons.link,
      title: i18n.t("general.import"),
      subtitle: i18n.t("new-recipe.import-by-url"),
      to: `/g/${groupSlug}/r/create/url`,
      restricted: true,
      hide: false,
    },
    {
      insertDivider: false,
      icon: icons.autoFix,
      title: i18n.t("recipe.import-with-ai"),
      subtitle: i18n.t("recipe.import-with-ai-subtitle"),
      to: `/g/${groupSlug}/r/create/ai`,
      restricted: true,
      hide: !showAIImport,
    },
    {
      insertDivider: true,
      icon: icons.edit,
      title: i18n.t("general.create"),
      subtitle: i18n.t("new-recipe.create-manually"),
      to: `/g/${groupSlug}/r/create/new`,
      restricted: true,
      hide: false,
    },
  ];

  const topLinks: SideBarLink[] = [
    {
      icon: icons.silverwareForkKnife,
      to: `/g/${groupSlug}`,
      title: i18n.t("general.recipes"),
      restricted: false,
    },
    {
      icon: icons.search,
      to: `/g/${groupSlug}/recipes/finder`,
      title: i18n.t("recipe-finder.recipe-finder"),
      restricted: false,
    },
    {
      icon: icons.calendarMultiselect,
      title: i18n.t("meal-plan.meal-planner"),
      to: "/household/mealplan/planner/view",
      restricted: true,
    },
    {
      icon: icons.formatListCheck,
      title: i18n.t("shopping-list.shopping-lists"),
      to: "/shopping-lists",
      restricted: true,
    },
    {
      icon: icons.timelineText,
      title: i18n.t("recipe.timeline"),
      to: `/g/${groupSlug}/recipes/timeline`,
      restricted: true,
    },
    {
      icon: icons.book,
      to: `/g/${groupSlug}/cookbooks`,
      title: i18n.t("cookbook.cookbooks"),
      restricted: true,
    },
    {
      icon: icons.organizers,
      title: i18n.t("general.organizers"),
      restricted: true,
      children: [
        {
          icon: icons.categories,
          to: `/g/${groupSlug}/recipes/categories`,
          title: i18n.t("sidebar.categories"),
          restricted: true,
        },
        {
          icon: icons.tags,
          to: `/g/${groupSlug}/recipes/tags`,
          title: i18n.t("sidebar.tags"),
          restricted: true,
        },
        {
          icon: icons.potSteam,
          to: `/g/${groupSlug}/recipes/tools`,
          title: i18n.t("tool.tools"),
          restricted: true,
        },
      ],
    },
  ];

  const closeCreateMenu = () => setCreateMenuAnchor(null);

  const createMenu = (
    <>
      {isOwnGroup && (
        <Box>
          <Button
            variant="contained"
            size="large"
            color="inherit"
            sx={{
              ml: 1,
              mt: 1.5,
              borderRadius: 999,
              bgcolor: theme => (theme.palette.mode === "dark" ? "grey.800" : "grey.200"),
            }}
            startIcon={<MdiIcon path={icons.createAlt} size="large" color="primary" />}
            aria-haspopup="menu"
            onClick={event => setCreateMenuAnchor(event.currentTarget)}
          >
            {i18n.t("general.create")}
          </Button>
        </Box>
      )}
      <Menu
        anchorEl={createMenuAnchor}
        open={!!createMenuAnchor}
        onClose={closeCreateMenu}
        slotProps={{ paper: { sx: { mt: 0.5, ml: 2 } } }}
      >
        {createLinks.filter(item => !item.hide).flatMap(item => [
          item.insertDivider ? <Divider key={`${item.title}-divider`} sx={{ mx: 1 }} /> : null,
          (!item.restricted || isOwnGroup)
            ? (
                <MenuItem key={item.title} component={Link} to={item.to} sx={{ my: 0.5 }} onClick={closeCreateMenu}>
                  <ListItemIcon sx={{ minWidth: 56 }}>
                    <MdiIcon path={item.icon} size={40} />
                  </ListItemIcon>
                  <ListItemText
                    primary={item.title}
                    secondary={item.subtitle}
                    slotProps={{
                      primary: { sx: { fontWeight: 500, fontSize: "small" } },
                      secondary: { sx: { fontWeight: 500, fontSize: "small" } },
                    }}
                  />
                </MenuItem>
              )
            : null,
        ])}
      </Menu>
    </>
  );

  const renderSidebar = (cookbooks: ReadCookBook[]) => (
    <AppSidebar open={sidebar} onOpenChange={setSidebar} topLink={topLinks} secondaryLinks={cookbookLinks(cookbooks)}>
      {createMenu}
    </AppSidebar>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <TheSnackbar />

      <AppHeader>
        <IconButton color="inherit" onClick={() => setSidebar(!sidebar)}>
          <MdiIcon path={icons.menu} />
        </IconButton>
      </AppHeader>

      {isOwnGroup
        ? <OwnCookbooks>{renderSidebar}</OwnCookbooks>
        : groupSlug
          ? <PublicCookbooks key={groupSlug} groupSlug={groupSlug}>{renderSidebar}</PublicCookbooks>
          : renderSidebar([])}

      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, pt: `${APP_HEADER_HEIGHT}px` }}>
        <Outlet />
      </Box>
    </Box>
  );
}
