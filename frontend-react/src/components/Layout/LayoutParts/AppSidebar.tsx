// Usage: <AppSidebar open={open} onOpenChange={setOpen} topLink={links} secondaryLinks={more}>{createMenu}</AppSidebar>
// The navigation drawer: user card, `children`, primary and secondary links (groups expand), and at the
// bottom announcements + the settings menu (language, dark mode, user/data/admin settings).
// Temporary overlay below lg, persistent (pushes the content) from lg up — like Vuetify's drawer.
import { Fragment, useState, type ReactNode } from "react";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Collapse from "@mui/material/Collapse";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { Link, useLocation } from "react-router";
import { AnnouncementDialog } from "@/components/Domain/Announcement/AnnouncementDialog";
import { UserAvatar } from "@/components/Domain/User/UserAvatar";
import { LanguageDialog } from "@/components/global/LanguageDialog";
import { MdiIcon } from "@/components/global/MdiIcon";
import { useAnnouncements } from "@/hooks/use-announcements";
import { useLoggedInState } from "@/hooks/use-logged-in-state";
import { useMealieAuth } from "@/hooks/use-mealie-auth";
import { useToggleDarkMode } from "@/hooks/use-utils";
import { useDisplay } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import { icons } from "@/lib/icons";
import { useColorMode } from "@/providers/color-mode";
import type { SideBarLink, SidebarLinks } from "@/types/application-types";
import { APP_HEADER_HEIGHT } from "./AppHeader";

export const SIDEBAR_WIDTH = 256;

interface AppSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topLink: SidebarLinks;
  secondaryLinks?: SidebarLinks | null;
  children?: ReactNode;
}

const navItemSx = { "borderRadius": 1, "mb": 0.25, "&.active": { color: "primary.main", bgcolor: "action.selected" } } as const;

export function AppSidebar({ open, onOpenChange, topLink, secondaryLinks = null, children }: AppSidebarProps) {
  const { t } = useI18n();
  const { mobile } = useDisplay();
  const location = useLocation();
  const auth = useMealieAuth();
  const sessionUser = auth.user;
  const { loggedIn, isOwnGroup } = useLoggedInState();
  const isAdmin = auth.user?.admin;
  const canManage = auth.user?.canManage;
  const { isDark } = useColorMode();

  const userFavoritesLink = auth.user ? `/user/${auth.user.id}/favorites` : undefined;
  const userProfileLink = auth.user ? "/user/profile" : undefined;

  const toggleDark = useToggleDarkMode();

  const [showAnnouncementsDialog, setShowAnnouncementsDialog] = useState(false);
  const { announcementsEnabled, newAnnouncements } = useAnnouncements();

  const [dropDowns, setDropDowns] = useState<Record<string, boolean>>({});
  const [languageDialog, setLanguageDialog] = useState(false);
  const [settingsAnchor, setSettingsAnchor] = useState<HTMLElement | null>(null);

  // Groups start as configured (Vue: initDropdowns), then follow the user's toggles.
  const isExpanded = (link: SideBarLink) => dropDowns[link.title] ?? link.childrenStartExpanded ?? false;
  const toggle = (link: SideBarLink) => setDropDowns(current => ({ ...current, [link.title]: !isExpanded(link) }));

  // Vuetify `exact` active state
  const isActive = (to?: string) => !!to && location.pathname.replace(/\/$/, "") === to.replace(/\/$/, "");

  function linkProps(to?: string) {
    return to ? { component: Link, to, className: isActive(to) ? "active" : undefined } : {};
  }

  function closeOnMobile() {
    if (mobile) {
      onOpenChange(false);
    }
  }

  function renderLinks(links: SidebarLinks, childIndent: number, dense: boolean) {
    return links.map((nav) => {
      if (nav.restricted && !isOwnGroup) {
        return null;
      }
      const key = nav.key || nav.title;

      if (nav.children) {
        // Multi Items
        const expanded = isExpanded(nav);
        return (
          <Fragment key={`${key}multi-item`}>
            <ListItemButton sx={navItemSx} dense={dense} onClick={() => toggle(nav)}>
              <ListItemIcon><MdiIcon path={nav.icon} /></ListItemIcon>
              <ListItemText primary={nav.title} />
              <MdiIcon path={icons.chevronDown} sx={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
            </ListItemButton>
            <Collapse in={expanded} unmountOnExit>
              <List disablePadding dense={dense}>
                {nav.children.map(child => (
                  <ListItemButton
                    key={child.key || child.title}
                    {...linkProps(child.to)}
                    sx={{ ...navItemSx, ml: childIndent }}
                    onClick={closeOnMobile}
                  >
                    <ListItemIcon><MdiIcon path={child.icon} /></ListItemIcon>
                    <ListItemText primary={child.title} />
                  </ListItemButton>
                ))}
              </List>
            </Collapse>
          </Fragment>
        );
      }

      // Single Item
      return (
        <ListItemButton key={`${key}single-item`} {...linkProps(nav.to)} sx={navItemSx} onClick={closeOnMobile}>
          <ListItemIcon><MdiIcon path={nav.icon} /></ListItemIcon>
          <ListItemText primary={nav.title} />
        </ListItemButton>
      );
    });
  }

  const closeSettings = () => setSettingsAnchor(null);

  return (
    <Drawer
      variant={mobile ? "temporary" : "persistent"}
      anchor="left"
      open={open}
      onClose={() => onOpenChange(false)}
      className="d-print-none"
      sx={{
        "displayPrint": "none",
        "width": open && !mobile ? SIDEBAR_WIDTH : 0,
        "flexShrink": 0,
        "& .MuiDrawer-paper": {
          width: SIDEBAR_WIDTH,
          top: APP_HEADER_HEIGHT,
          height: `calc(100% - ${APP_HEADER_HEIGHT}px)`,
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <AnnouncementDialog open={showAnnouncementsDialog} onOpenChange={setShowAnnouncementsDialog} />
      <LanguageDialog open={languageDialog} onOpenChange={setLanguageDialog} />
      {/* User Profile */}
      {loggedIn && sessionUser && (
        <>
          <ListItemButton
            {...linkProps(userProfileLink)}
            sx={{ "py": 1, "&.active": { bgcolor: "action.selected" } }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <UserAvatar list userId={sessionUser.id} tooltip={false} />

              <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "flex-start" }}>
                <Box sx={{ pr: 1, pl: 0.5, typography: "body1" }}>
                  {sessionUser.fullName}
                </Box>
                <Box>
                  {isOwnGroup && userFavoritesLink && (
                    <Button
                      component={Link}
                      to={userFavoritesLink}
                      size="small"
                      variant="text"
                      color="inherit"
                      sx={{ px: 1 }}
                      startIcon={<MdiIcon path={icons.heart} size="small" />}
                      onClick={event => event.stopPropagation()}
                    >
                      {t("user.favorite-recipes")}
                    </Button>
                  )}
                </Box>
              </Box>
            </Box>
          </ListItemButton>
          <Divider />
        </>
      )}

      {children}

      {/* Primary Links */}
      {topLink && (
        <List component="nav" sx={{ px: 1 }}>
          {renderLinks(topLink, 2, false)}
        </List>
      )}

      {/* Secondary Links */}
      {secondaryLinks && secondaryLinks.length > 0 && (
        <>
          <Divider sx={{ mt: 1 }} />
          <List component="nav" dense sx={{ px: 1 }}>
            {renderLinks(secondaryLinks, 1, true)}
          </List>
        </>
      )}

      {/* Bottom Navigation Links */}
      <List component="nav" sx={{ px: 1, mt: "auto" }}>
        {loggedIn && announcementsEnabled && (
          <ListItemButton sx={navItemSx} onClick={() => setShowAnnouncementsDialog(!showAnnouncementsDialog)}>
            <ListItemIcon>
              <Badge
                invisible={!newAnnouncements.length}
                color="accent"
                badgeContent={newAnnouncements.length || undefined}
              >
                <MdiIcon path={icons.bullhornVariant} />
              </Badge>
            </ListItemIcon>
            <ListItemText primary={t("announcements.announcements")} />
          </ListItemButton>
        )}
        <ListItemButton
          sx={navItemSx}
          aria-haspopup="menu"
          aria-expanded={settingsAnchor ? "true" : undefined}
          onClick={event => setSettingsAnchor(event.currentTarget)}
        >
          <ListItemIcon><MdiIcon path={icons.cog} /></ListItemIcon>
          <ListItemText primary={t("general.settings")} />
        </ListItemButton>
        <Menu
          anchorEl={settingsAnchor}
          open={!!settingsAnchor}
          onClose={closeSettings}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "bottom", horizontal: "left" }}
          slotProps={{ paper: { sx: { ml: 2 } } }}
        >
          <MenuItem
            onClick={() => {
              closeSettings();
              setLanguageDialog(true);
            }}
          >
            <ListItemIcon><MdiIcon path={icons.translate} /></ListItemIcon>
            <ListItemText primary={t("sidebar.language")} />
          </MenuItem>
          <MenuItem
            onClick={() => {
              closeSettings();
              toggleDark();
            }}
          >
            <ListItemIcon><MdiIcon path={isDark ? icons.weatherSunny : icons.weatherNight} /></ListItemIcon>
            <ListItemText primary={isDark ? t("settings.theme.light-mode") : t("settings.theme.dark-mode")} />
          </MenuItem>
          {loggedIn && <Divider sx={{ my: 1 }} />}
          {loggedIn && (
            <MenuItem component={Link} to="/user/profile" onClick={closeSettings}>
              <ListItemIcon><MdiIcon path={icons.cog} /></ListItemIcon>
              <ListItemText primary={t("profile.user-settings")} />
            </MenuItem>
          )}
          {canManage && (
            <MenuItem component={Link} to="/group/data" onClick={closeSettings}>
              <ListItemIcon><MdiIcon path={icons.manageData} /></ListItemIcon>
              <ListItemText primary={t("data-pages.data-management")} />
            </MenuItem>
          )}
          {isAdmin && <Divider sx={{ my: 1 }} />}
          {isAdmin && (
            <MenuItem component={Link} to="/admin/site-settings" onClick={closeSettings}>
              <ListItemIcon><MdiIcon path={icons.wrench} /></ListItemIcon>
              <ListItemText primary={t("settings.admin-settings")} />
            </MenuItem>
          )}
        </Menu>
      </List>
    </Drawer>
  );
}
