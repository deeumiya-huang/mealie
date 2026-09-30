import { useState } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import { useNavigate, useParams } from "react-router";
import { icons } from "~/lib/icons";
import type { Recipe, RecipeTimelineEventOut, RecipeTimelineEventUpdate } from "~/lib/api/types/recipe";
import { useStaticRoutes } from "~/hooks/api";
import { useTimelineEventTypes } from "~/hooks/recipes/use-recipe-timeline-events";
import { useDisplay } from "~/hooks/use-display";
import { useI18n } from "~/hooks/use-global-i18n";
import { useMealieAuth } from "~/hooks/use-mealie-auth";
import { Icon } from "~/components/global/Icon";
import { SafeMarkdown } from "~/components/global/SafeMarkdown";
import { UserAvatar } from "~/components/Domain/User/UserAvatar";
import { RecipeCardMobile } from "./RecipeCardMobile";
import { RecipeTimelineContextMenu } from "./RecipeTimelineContextMenu";

export interface RecipeTimelineItemProps {
  event: RecipeTimelineEventOut;
  recipe?: Recipe;
  showRecipeCards?: boolean;
  /** Side of the line the card sits on (Vuetify alternated them). */
  side?: "start" | "end";
  onSelected?: () => void;
  onUpdate?: (event: RecipeTimelineEventUpdate) => void;
  onDelete?: () => void;
}

/** One entry of the timeline: date chip | dot | card, alternating sides on wide screens. */
export function RecipeTimelineItem({ event, recipe, showRecipeCards = false, side = "end", onSelected, onUpdate, onDelete }: RecipeTimelineItemProps) {
  const i18n = useI18n();
  const display = useDisplay();
  const navigate = useNavigate();
  const params = useParams();
  const { recipeTimelineEventSmallImage } = useStaticRoutes();
  const { eventTypeOptions } = useTimelineEventTypes();
  const { user: currentUser } = useMealieAuth();
  const groupSlug = params.groupSlug || currentUser?.groupSlug || "";
  const useMobileFormat = display.smAndDown;
  const [hideImage, setHideImage] = useState(false);

  const attrs = useMobileFormat
    ? { avatar: { size: "30", pr: 0 }, image: { maxHeight: 250, sx: { my: 1.5 } } }
    : { avatar: { size: "42", pr: undefined }, image: { maxHeight: 300, sx: { mb: 2.5 } } };
  const icon = eventTypeOptions.find(option => option.value === event.eventType)?.icon ?? icons.informationVariant;
  const eventImageUrl = event.image === "has image" ? recipeTimelineEventSmallImage(event.recipeId, event.id) : "";
  const dateChip = (
    <Chip sx={{ borderRadius: 1 }} icon={<Icon path={icons.calendar} />} label={i18n.d(new Date(event.timestamp || ""))} />
  );

  const card = (
    <Card
      elevation={12}
      sx={{ cursor: "pointer", width: "100%" }}
      onClick={() => {
        onSelected?.();
        if (!onSelected && recipe) void navigate(`/g/${groupSlug}/r/${recipe.slug}`);
      }}
    >
      <Box sx={{ bgcolor: "background.default", p: 2 }}>
        <Grid container spacing={1} sx={{ alignItems: "center" }}>
          <Grid size={useMobileFormat ? "auto" : 2} sx={{ pr: attrs.avatar.pr }}>
            <UserAvatar userId={event.userId} size={attrs.avatar.size} />
          </Grid>
          {useMobileFormat
            ? <Grid size="grow" sx={{ pr: 0 }}>{dateChip}</Grid>
            : <Grid size={9} sx={{ textAlign: "center", overflowWrap: "anywhere", typography: "h6" }}>{event.subject}</Grid>}
          <Grid size={useMobileFormat ? "auto" : 1} sx={{ px: 0 }}>
            {currentUser && currentUser.id === event.userId && event.eventType !== "system" && (
              <RecipeTimelineContextMenu
                menuTop={false}
                event={event}
                menuIcon={icons.dotsVertical}
                useItems={{ edit: true, delete: true }}
                onUpdate={onUpdate}
                onDelete={onDelete}
              />
            )}
          </Grid>
        </Grid>
      </Box>
      {showRecipeCards && recipe && (
        <CardContent sx={{ bgcolor: "background.default" }}>
          <Box sx={{ py: 1.5, maxWidth: "100%" }}>
            <RecipeCardMobile
              disableHighlight
              vertical={useMobileFormat}
              name={recipe.name ?? ""}
              slug={recipe.slug ?? ""}
              description={recipe.description ?? ""}
              rating={recipe.rating ?? 0}
              image={recipe.image}
              recipeId={recipe.id ?? ""}
              isFlat
            />
          </Box>
        </CardContent>
      )}
      {showRecipeCards && recipe && (useMobileFormat || event.eventMessage) && <Divider />}
      <CardContent sx={{ bgcolor: "background.default" }}>
        {useMobileFormat && <strong style={{ overflowWrap: "anywhere" }}>{event.subject}</strong>}
        {eventImageUrl && !hideImage && (
          <Box
            component="img"
            src={eventImageUrl}
            onError={() => setHideImage(true)}
            sx={{ display: "block", minHeight: 50, maxHeight: attrs.image.maxHeight, maxWidth: "100%", objectFit: "contain", mx: "auto", ...attrs.image.sx }}
          />
        )}
        {event.eventMessage && (
          <Box sx={{ overflowWrap: "anywhere", ...(useMobileFormat ? { typography: "caption" } : {}) }}>
            <SafeMarkdown source={event.eventMessage} />
          </Box>
        )}
      </CardContent>
    </Card>
  );

  const dot = (
    <Box sx={{ position: "relative", display: "flex", justifyContent: "center", width: 48, flexShrink: 0 }}>
      <Box sx={{ position: "absolute", top: 0, bottom: 0, width: 2, bgcolor: "divider" }} />
      <Box sx={{ position: "relative", mt: 2, width: 36, height: 36, borderRadius: "50%", bgcolor: "primary.main", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon path={icon} size="small" />
      </Box>
    </Box>
  );

  if (useMobileFormat) {
    return (
      <Box sx={{ display: "flex", px: 0, pb: 3 }}>
        {dot}
        <Box sx={{ flex: 1, minWidth: 0 }}>{card}</Box>
      </Box>
    );
  }

  const opposite = <Box sx={{ flex: 1, display: "flex", justifyContent: side === "end" ? "flex-end" : "flex-start", pt: 2, px: 2 }}>{dateChip}</Box>;
  const content = <Box sx={{ flex: 1, minWidth: 0, px: 1.5 }}>{card}</Box>;
  return (
    <Box sx={{ display: "flex", pb: 3 }}>
      {side === "end" ? opposite : content}
      {dot}
      {side === "end" ? content : opposite}
    </Box>
  );
}

export default RecipeTimelineItem;
