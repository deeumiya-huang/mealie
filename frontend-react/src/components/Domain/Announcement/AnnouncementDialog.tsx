// Usage: <AnnouncementDialog open={open} onOpenChange={setOpen} /> — browse the announcements; opens on the
// first unread one (or the newest), marks each one shown as read, closes on navigation.
import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import { useLocation } from "react-router";
import { BaseButton } from "@/components/global/BaseButton";
import { BaseDialog } from "@/components/global/BaseDialog";
import { MdiIcon } from "@/components/global/MdiIcon";
import { useAnnouncements, type Announcement } from "@/hooks/use-announcements";
import { useDisplay } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import { icons } from "@/lib/icons";

interface AnnouncementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Vuetify utility classes used by the announcement bodies (Vue: scoped `p { padding-bottom: 8px }`).
const bodySx = {
  "& p": { pb: "8px", m: 0 },
  "& .mb-1": { mb: 0.5 },
  "& .mb-2": { mb: 1 },
  "& .mt-2": { mt: 1 },
  "& .mt-3": { mt: 1.5 },
  "& .mb-4": { mb: 2 },
  "& .ml-6": { ml: 3 },
  "& .text-primary": { color: "primary.main" },
} as const;

export function AnnouncementDialog({ open, onOpenChange }: AnnouncementDialogProps) {
  const { t, d } = useI18n();
  const display = useDisplay();
  const useMobile = display.smAndDown;
  const [navOpen, setNavOpen] = useState(false);

  const { newAnnouncements, allAnnouncements, setLastRead, markAllAsRead } = useAnnouncements();
  const [currentAnnouncement, setCurrentAnnouncement] = useState<Announcement | undefined>();

  // Show first unread on open, or fall back to the newest (Vue: watch(dialog))
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open && !currentAnnouncement) {
      setCurrentAnnouncement(newAnnouncements.at(0) || allAnnouncements.at(-1)!);
    }
  }

  // Every announcement that is shown counts as read
  useEffect(() => {
    if (currentAnnouncement) {
      void setLastRead(currentAnnouncement.key);
    }
  }, [currentAnnouncement, setLastRead]);

  // Close when the route changes (Vue: watch(route.fullPath))
  const location = useLocation();
  const fullPath = `${location.pathname}${location.search}${location.hash}`;
  const lastPath = useRef(fullPath);
  useEffect(() => {
    if (lastPath.current !== fullPath) {
      lastPath.current = fullPath;
      onOpenChange(false);
    }
  }, [fullPath, onOpenChange]);

  function nextAnnouncement() {
    // Find the first unread announcement after the current one (current is already removed from newAnnouncements)
    const next = newAnnouncements.find(a => a.key > currentAnnouncement!.key);
    if (next) {
      setCurrentAnnouncement(next);
    }
  }

  function isLastAnnouncement(key: string) {
    if (!newAnnouncements.length) {
      return true;
    }
    else {
      return key >= newAnnouncements.at(-1)!.key;
    }
  }

  if (!currentAnnouncement) {
    return null;
  }

  const Body = currentAnnouncement.component;

  return (
    <BaseDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("announcements.announcements")}
      icon={icons.bullhornVariant}
      cancelText={t("general.done")}
      width="100%"
      maxWidth="1200"
      customCardAction={(
        <>
          {newAnnouncements.length > 0 && (
            <BaseButton
              color="success"
              icon={icons.textBoxCheckOutline}
              text={t("announcements.mark-all-as-read")}
              onClick={() => void markAllAsRead()}
            />
          )}
          <BaseButton
            disabled={isLastAnnouncement(currentAnnouncement.key)}
            color="info"
            icon={icons.arrowRightBold}
            iconRight
            text={t("general.next")}
            onClick={nextAnnouncement}
          />
        </>
      )}
    >
      <Box sx={{ display: "flex", height: useMobile ? "100%" : "60vh", minHeight: "60vh" }}>
        {/* Nav list */}
        <List
          dense
          sx={{
            display: !useMobile || navOpen ? "block" : "none",
            overflowY: "auto",
            borderRight: 1,
            borderColor: "divider",
            flexShrink: 0,
            width: "200px",
            maxHeight: "60vh",
            px: 1,
          }}
        >
          {allAnnouncements.toReversed().map(announcement => (
            <ListItemButton
              key={announcement.key}
              selected={currentAnnouncement.key === announcement.key}
              sx={{ "borderRadius": 1, "&.Mui-selected": { color: "primary.main" } }}
              onClick={() => {
                setCurrentAnnouncement(announcement);
                setNavOpen(false);
              }}
            >
              <ListItemText
                primary={announcement.meta?.title}
                secondary={announcement.date ? d(announcement.date) : undefined}
                slotProps={{ primary: { variant: "body2" } }}
              />
              {newAnnouncements.some(a => a.key === announcement.key) && (
                <MdiIcon path={icons.alertCircle} size="x-small" color="info" />
              )}
            </ListItemButton>
          ))}
        </List>

        {/* Main content */}
        <Box sx={{ flexGrow: 1, overflowY: "auto" }}>
          {useMobile && (
            <Button
              size="small"
              variant="text"
              startIcon={<MdiIcon path={navOpen ? icons.chevronLeft : icons.chevronRight} />}
              sx={{ mt: 1, ms: 1 }}
              onClick={() => setNavOpen(!navOpen)}
            >
              {t("announcements.all-announcements")}
            </Button>
          )}
          <Typography variant="h6" component="div" sx={{ px: 2, pt: 2 }}>
            {currentAnnouncement.date && (
              <Chip
                sx={{ mr: 0.5, borderRadius: 1 }}
                icon={<MdiIcon path={icons.calendar} />}
                label={d(currentAnnouncement.date)}
              />
            )}
            {currentAnnouncement.meta?.title}
          </Typography>
          <CardContent sx={bodySx}>
            <Body />
          </CardContent>
        </Box>
      </Box>
    </BaseDialog>
  );
}
