import { useEffect, useState } from "react";
import type { ReactNode } from "react";
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
import Toolbar from "@mui/material/Toolbar";
import { NavLink, Link as RouterLink } from "react-router";
import { icons } from "~/lib/icons";
import type { SideBarLink, SidebarLinks } from "~/types/application-types";
import { useAnnouncements } from "~/hooks/use-announcements";
import { useDisplay } from "~/hooks/use-display";
import { useI18n } from "~/hooks/use-global-i18n";
import { useLoggedInState } from "~/hooks/use-logged-in-state";
import { useMealieAuth } from "~/hooks/use-mealie-auth";
import { useToggleDarkMode } from "~/hooks/use-utils";
import { useDark } from "~/theme/color-scheme";
import { Icon } from "~/components/global/Icon";
import { LanguageDialog } from "~/components/global/LanguageDialog";
import { AnnouncementDialog } from "~/components/Domain/Announcement/AnnouncementDialog";
import { UserAvatar } from "~/components/Domain/User/UserAvatar";

export const SIDEBAR_WIDTH = 256;

export interface AppSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topLink: SidebarLinks;
  secondaryLinks?: SidebarLinks | null;
  secondaryHeader?: string;
  children?: ReactNode;
}

function NavItem({ link, dense, indent = 0 }: { link: SideBarLink; dense?: boolean; indent?: number }) {
  return (
    <ListItemButton
      component={NavLink}
      to={link.to ?? "#"}
      end
      dense={dense}
      sx={{
        "borderRadius": 1,
        "ml": indent,
        "&.active": { "color": "primary.main", "bgcolor": "action.selected", "& .MuiListItemIcon-root": { color: "primary.main" } },
      }}
    >
      <ListItemIcon sx={{ minWidth: 40 }}><Icon path={link.icon} /></ListItemIcon>
      <ListItemText primary={link.title} />
    </ListItemButton>
  );
}

function NavGroup({ link, open, onToggle, dense, childIndent }: { link: SideBarLink; open: boolean; onToggle: () => void; dense?: boolean; childIndent: number }) {
  return (
    <>
      <ListItemButton dense={dense} onClick={onToggle} sx={{ borderRadius: 1 }}>
        <ListItemIcon sx={{ minWidth: 40 }}><Icon path={link.icon} /></ListItemIcon>
        <ListItemText primary={link.title} />
        <Icon path={open ? icons.chevronDown : icons.chevronRight} fontSize="small" />
      </ListItemButton>
      <Collapse in={open} unmountOnExit>
        <List disablePadding dense={dense}>
          {link.children?.map(child => <NavItem key={child.key || child.title} link={child} dense={dense} indent={childIndent} />)}
        </List>
      </Collapse>
    </>
  );
}

export function AppSidebar({ open, onOpenChange, topLink, secondaryLinks = null, children }: AppSidebarProps) {
  const i18n = useI18n();
  const auth = useMealieAuth();
  const display = useDisplay();
  const [isDark] = useDark();
  const toggleDark = useToggleDarkMode();
  const { loggedIn, isOwnGroup } = useLoggedInState();
  const sessionUser = auth.user;
  const isAdmin = auth.user?.admin;
  const canManage = auth.user?.canManage;
  const [showAnnouncementsDialog, setShowAnnouncementsDialog] = useState(false);
  const [languageDialog, setLanguageDialog] = useState(false);
  const [settingsAnchor, setSettingsAnchor] = useState<HTMLElement | null>(null);
  const { announcementsEnabled, newAnnouncements } = useAnnouncements();
  const [dropDowns, setDropDowns] = useState<Record<string, boolean>>({});

  const allLinks = [...topLink, ...(secondaryLinks || [])];
  const linksKey = allLinks.map(l => l.title).join("|");
  useEffect(() => {
    setDropDowns(Object.fromEntries(allLinks.map(link => [link.title, link.childrenStartExpanded || false])));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- re-init when the set of links changes
  }, [linksKey]);

  const toggle = (title: string) => setDropDowns(prev => ({ ...prev, [title]: !prev[title] }));
  const temporary = !display.lgAndUp;

  const renderLinks = (links: SidebarLinks, dense: boolean, childIndent: number) => links
    .filter(nav => !nav.restricted || isOwnGroup)
    .map(nav => (
      <div key={nav.key || nav.title}>
        {nav.children
          ? <NavGroup link={nav} open={!!dropDowns[nav.title]} onToggle={() => toggle(nav.title)} dense={dense} childIndent={childIndent} />
          : <NavItem link={nav} dense={dense} />}
      </div>
    ));

  return (
    <Drawer
      variant={temporary ? "temporary" : "persistent"}
      open={open}
      onClose={() => onOpenChange(false)}
      className="d-print-none"
      sx={{
        "width": open && !temporary ? SIDEBAR_WIDTH : 0,
        "flexShrink": 0,
        "transition": "width 200ms",
        "& .MuiDrawer-paper": { width: SIDEBAR_WIDTH, boxSizing: "border-box", display: "flex", flexDirection: "column" },
      }}
    >
      {!temporary && <Toolbar variant="dense" sx={{ minHeight: 48 }} />}
      <AnnouncementDialog open={showAnnouncementsDialog} onOpenChange={setShowAnnouncementsDialog} />
      <LanguageDialog open={languageDialog} onOpenChange={setLanguageDialog} />

      <Box sx={{ flex: 1, overflowY: "auto" }}>
        {loggedIn && sessionUser && (
          <>
            <ListItemButton component={RouterLink} to="/user/profile" sx={{ py: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <UserAvatar list userId={sessionUser.id} tooltip={false} />
                <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "flex-start" }}>
                  <Box sx={{ pr: 1, pl: 0.5 }}>{sessionUser.fullName}</Box>
                  {isOwnGroup && (
                    <Button
                      size="small"
                      variant="text"
                      component={RouterLink}
                      to={`/user/${sessionUser.id}/favorites`}
                      onClick={e => e.stopPropagation()}
                      startIcon={<Icon path={icons.heart} size="small" />}
                      sx={{ px: 1, justifyContent: "flex-start" }}
                    >
                      {i18n.t("user.favorite-recipes")}
                    </Button>
                  )}
                </Box>
              </Box>
            </ListItemButton>
            <Divider />
          </>
        )}

        {children}

        {topLink.length > 0 && <List sx={{ px: 1 }}>{renderLinks(topLink, false, 2)}</List>}

        {secondaryLinks && secondaryLinks.length > 0 && (
          <>
            <Divider sx={{ mt: 1 }} />
            <List dense sx={{ px: 1 }}>{renderLinks(secondaryLinks, true, 1)}</List>
          </>
        )}
      </Box>

      <List sx={{ px: 1 }}>
        {loggedIn && announcementsEnabled && (
          <ListItemButton sx={{ borderRadius: 1 }} onClick={() => setShowAnnouncementsDialog(!showAnnouncementsDialog)}>
            <ListItemIcon sx={{ minWidth: 40 }}>
              <Badge color="accent" badgeContent={newAnnouncements.length || undefined} invisible={!newAnnouncements.length}>
                <Icon path={icons.bullhornVariant} />
              </Badge>
            </ListItemIcon>
            <ListItemText primary={i18n.t("announcements.announcements")} />
          </ListItemButton>
        )}
        <ListItemButton sx={{ borderRadius: 1 }} onClick={e => setSettingsAnchor(e.currentTarget)}>
          <ListItemIcon sx={{ minWidth: 40 }}><Icon path={icons.cog} /></ListItemIcon>
          <ListItemText primary={i18n.t("general.settings")} />
        </ListItemButton>
        <Menu
          anchorEl={settingsAnchor}
          open={!!settingsAnchor}
          onClose={() => setSettingsAnchor(null)}
          onClick={() => setSettingsAnchor(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "bottom", horizontal: "left" }}
        >
          <MenuItem onClick={() => setLanguageDialog(true)}>
            <ListItemIcon><Icon path={icons.translate} /></ListItemIcon>
            <ListItemText>{i18n.t("sidebar.language")}</ListItemText>
          </MenuItem>
          <MenuItem onClick={toggleDark}>
            <ListItemIcon><Icon path={isDark ? icons.weatherSunny : icons.weatherNight} /></ListItemIcon>
            <ListItemText>{isDark ? i18n.t("settings.theme.light-mode") : i18n.t("settings.theme.dark-mode")}</ListItemText>
          </MenuItem>
          {loggedIn && <Divider sx={{ my: 1 }} />}
          {loggedIn && (
            <MenuItem component={RouterLink} to="/user/profile">
              <ListItemIcon><Icon path={icons.cog} /></ListItemIcon>
              <ListItemText>{i18n.t("profile.user-settings")}</ListItemText>
            </MenuItem>
          )}
          {canManage && (
            <MenuItem component={RouterLink} to="/group/data">
              <ListItemIcon><Icon path={icons.manageData} /></ListItemIcon>
              <ListItemText>{i18n.t("data-pages.data-management")}</ListItemText>
            </MenuItem>
          )}
          {isAdmin && <Divider sx={{ my: 1 }} />}
          {isAdmin && (
            <MenuItem component={RouterLink} to="/admin/site-settings">
              <ListItemIcon><Icon path={icons.wrench} /></ListItemIcon>
              <ListItemText>{i18n.t("settings.admin-settings")}</ListItemText>
            </MenuItem>
          )}
        </Menu>
      </List>
    </Drawer>
  );
}

export default AppSidebar;
