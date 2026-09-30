import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import { useLocation } from "react-router";
import { icons } from "~/lib/icons";
import { useAnnouncements } from "~/hooks/use-announcements";
import type { Announcement } from "~/hooks/use-announcements";
import { useDisplay } from "~/hooks/use-display";
import { useI18n } from "~/hooks/use-global-i18n";
import { BaseButton } from "~/components/global/BaseButton";
import { BaseDialog } from "~/components/global/BaseDialog";
import { Icon } from "~/components/global/Icon";

export function AnnouncementDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const i18n = useI18n();
  const display = useDisplay();
  const useMobile = display.smAndDown;
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();
  const { newAnnouncements, allAnnouncements, setLastRead, markAllAsRead } = useAnnouncements();
  const [currentAnnouncement, setCurrent] = useState<Announcement | undefined>();

  useEffect(() => {
    onOpenChange(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- close on navigation only
  }, [location.pathname, location.search]);

  function setCurrentAnnouncement(announcement: Announcement) {
    setCurrent(announcement);
    void setLastRead(announcement.key);
  }

  useEffect(() => {
    if (!open || currentAnnouncement) return;
    // Show first unread on open, or fall back to the newest
    const next = newAnnouncements.at(0) || allAnnouncements.at(-1);
    if (next) setCurrentAnnouncement(next);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- runs when the dialog opens
  }, [open]);

  function nextAnnouncement() {
    // Find the first unread announcement after the current one (current is already removed from newAnnouncements)
    const next = newAnnouncements.find(a => a.key > currentAnnouncement!.key);
    if (next) setCurrentAnnouncement(next);
  }

  function isLastAnnouncement(key: string) {
    if (!newAnnouncements.length) return true;
    return key >= newAnnouncements.at(-1)!.key;
  }

  if (!currentAnnouncement) {
    return null;
  }
  const Content = currentAnnouncement.component;

  return (
    <BaseDialog
      open={open}
      onOpenChange={onOpenChange}
      title={i18n.t("announcements.announcements")}
      icon={icons.bullhornVariant}
      cancelText={i18n.t("general.done")}
      width="100%"
      maxWidth="1200"
      customCardAction={(
        <>
          {newAnnouncements.length > 0 && (
            <BaseButton color="success" icon={icons.textBoxCheckOutline} text={i18n.t("announcements.mark-all-as-read")} onClick={() => void markAllAsRead()} />
          )}
          <BaseButton
            disabled={isLastAnnouncement(currentAnnouncement.key)}
            color="info"
            icon={icons.arrowRightBold}
            iconRight
            text={i18n.t("general.next")}
            onClick={nextAnnouncement}
          />
        </>
      )}
    >
      <Box sx={{ display: "flex", height: useMobile ? "100%" : "60vh", minHeight: "60vh" }}>
        {(!useMobile || navOpen) && (
          <List dense sx={{ width: 200, maxHeight: "60vh", overflowY: "auto", borderInlineEnd: 1, borderColor: "divider", flexShrink: 0, px: 1 }}>
            {allAnnouncements.toReversed().map(announcement => (
              <ListItemButton
                key={announcement.key}
                selected={currentAnnouncement.key === announcement.key}
                sx={{ borderRadius: 1 }}
                onClick={() => {
                  setCurrentAnnouncement(announcement);
                  setNavOpen(false);
                }}
              >
                <ListItemText
                  primary={announcement.meta?.title}
                  secondary={announcement.date ? i18n.d(announcement.date) : undefined}
                  slotProps={{ primary: { variant: "body2" } }}
                />
                {newAnnouncements.some(a => a.key === announcement.key) && <Icon path={icons.alertCircle} size="x-small" color="info" />}
              </ListItemButton>
            ))}
          </List>
        )}
        <Box sx={{ flexGrow: 1, overflowY: "auto" }}>
          {useMobile && (
            <Button
              size="small"
              sx={{ mt: 1, ml: 1 }}
              startIcon={<Icon path={navOpen ? icons.chevronLeft : icons.chevronRight} />}
              onClick={() => setNavOpen(!navOpen)}
            >
              {i18n.t("announcements.all-announcements")}
            </Button>
          )}
          <Typography variant="h6" component="div" sx={{ p: 2, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
            {currentAnnouncement.date && (
              <Chip label={i18n.d(currentAnnouncement.date)} icon={<Icon path={icons.calendar} />} sx={{ borderRadius: 1 }} />
            )}
            {currentAnnouncement.meta?.title}
          </Typography>
          <CardContent>
            <Content />
          </CardContent>
        </Box>
      </Box>
    </BaseDialog>
  );
}

export default AnnouncementDialog;
