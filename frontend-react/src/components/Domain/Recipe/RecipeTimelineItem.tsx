// Usage: <Timeline>{events.map(event => <RecipeTimelineItem key={event.id} event={event} recipe={recipe}
//   showRecipeCards onUpdate={updated => …} onDelete={() => …} />)}</Timeline>   (Timeline from @mui/lab)
// One timeline entry: icon dot, date (beside the line on wide screens, in the card on small ones), a card with the
// author's avatar, the subject, the owner's edit/delete menu, optionally the recipe's card, the event image and
// its markdown message. The card links to the recipe unless `onSelected` is given or the recipe is unknown.
import { useState } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import TimelineConnector from "@mui/lab/TimelineConnector";
import TimelineContent from "@mui/lab/TimelineContent";
import TimelineDot from "@mui/lab/TimelineDot";
import TimelineItem from "@mui/lab/TimelineItem";
import TimelineOppositeContent from "@mui/lab/TimelineOppositeContent";
import TimelineSeparator from "@mui/lab/TimelineSeparator";
import { Link, useParams } from "react-router";
import { BaseImg } from "@/components/global/BaseImg";
import { MdiIcon } from "@/components/global/MdiIcon";
import { SafeMarkdown } from "@/components/global/SafeMarkdown";
import { UserAvatar } from "@/components/Domain/User/UserAvatar";
import { useStaticRoutes } from "@/hooks/api";
import { useTimelineEventTypes } from "@/hooks/recipes/use-recipe-timeline-events";
import { useMealieAuth } from "@/hooks/use-mealie-auth";
import { useDisplay } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import type { Recipe, RecipeTimelineEventOut, RecipeTimelineEventUpdate } from "@/lib/api/types/recipe";
import { icons } from "@/lib/icons";
import { RecipeCardMobile } from "./RecipeCardMobile";
import { RecipeTimelineContextMenu } from "./RecipeTimelineContextMenu";

interface RecipeTimelineItemProps {
  event: RecipeTimelineEventOut;
  recipe?: Recipe;
  showRecipeCards?: boolean;
  onSelected?: () => void;
  onUpdate?: (event: RecipeTimelineEventUpdate) => void;
  onDelete?: () => void;
}

export function RecipeTimelineItem({ event, recipe, showRecipeCards = false, onSelected, onUpdate, onDelete }: RecipeTimelineItemProps) {
  const { d } = useI18n();
  const { smAndDown } = useDisplay();
  const { recipeTimelineEventSmallImage } = useStaticRoutes();
  const { eventTypeOptions } = useTimelineEventTypes();
  const { user: currentUser } = useMealieAuth();
  const params = useParams();
  const [hideImage, setHideImage] = useState(false);

  const groupSlug = params.groupSlug || currentUser?.groupSlug || "";
  const useMobileFormat = smAndDown;

  const attrs = useMobileFormat
    ? {
        class: "px-0",
        avatar: { size: "30", pr: 0 },
        image: { maxHeight: 250, my: 1.5, mb: undefined },
      }
    : {
        class: "px-3",
        avatar: { size: "42", pr: undefined },
        image: { maxHeight: 300, my: undefined, mb: 2.5 },
      };

  const option = eventTypeOptions.find(option => option.value === event.eventType);
  const icon = option ? option.icon : icons.informationVariant;

  const eventImageUrl = event.image === "has image" ? recipeTimelineEventSmallImage(event.recipeId, event.id) : "";

  const linkToRecipe = !onSelected && recipe;
  const cardSx = {
    "boxShadow": 12,
    "display": "block",
    "color": "inherit",
    "textDecoration": "none",
    "cursor": linkToRecipe || onSelected ? "pointer" : undefined,
    "overflow": "visible",
    "&:hover": { boxShadow: 12 },
  } as const;

  const dateChip = (
    <Chip
      sx={{ borderRadius: "4px" }}
      icon={<MdiIcon path={icons.calendar} />}
      label={d(new Date(event.timestamp || ""))}
    />
  );

  const cardContent = (
    <>
      <Box sx={{ bgcolor: "background.default", px: 2, py: 1, display: "flex", alignItems: "center", gap: 1, borderRadius: "inherit" }}>
        <Box sx={{ alignSelf: "center", pr: attrs.avatar.pr, flex: useMobileFormat ? "0 0 auto" : "0 0 16.6667%" }}>
          <UserAvatar userId={event.userId} size={attrs.avatar.size} />
        </Box>
        {useMobileFormat
          ? <Box sx={{ alignSelf: "center", pr: 0, flex: "1 1 auto" }}>{dateChip}</Box>
          : (
              <Box className="break-word" sx={{ m: "auto", textAlign: "center", flex: "1 1 auto", overflowWrap: "anywhere", fontSize: "1.25rem", fontWeight: 500 }}>
                {event.subject}
              </Box>
            )}
        <Box sx={{ px: 0, pt: 0, flex: useMobileFormat ? "0 0 auto" : "0 0 8.3333%" }}>
          {currentUser && currentUser.id === event.userId && event.eventType !== "system" && (
            <RecipeTimelineContextMenu
              menuTop={false}
              event={event}
              menuIcon={icons.dotsVertical}
              color="transparent"
              elevation={0}
              useItems={{
                edit: true,
                delete: true,
              }}
              onUpdate={updated => onUpdate?.(updated)}
              onDelete={() => onDelete?.()}
            />
          )}
        </Box>
      </Box>
      {showRecipeCards && recipe && (
        <CardContent sx={{ bgcolor: "background.default" }}>
          <Box sx={{ py: 1.5, mx: 0, maxWidth: "100%" }}>
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
        {useMobileFormat && <Box component="strong" className="break-word" sx={{ overflowWrap: "anywhere" }}>{event.subject}</Box>}
        {eventImageUrl && (
          <BaseImg
            src={eventImageUrl}
            minHeight={50}
            height={hideImage ? undefined : "auto"}
            maxHeight={attrs.image.maxHeight}
            sx={{ my: attrs.image.my, mb: attrs.image.mb }}
            onError={() => setHideImage(true)}
          />
        )}
        {event.eventMessage && (
          <Box className="break-word" sx={{ overflowWrap: "anywhere", fontSize: useMobileFormat ? "0.75rem" : undefined }}>
            <SafeMarkdown source={event.eventMessage} />
          </Box>
        )}
      </CardContent>
    </>
  );

  return (
    <TimelineItem
      className={attrs.class}
      sx={{ px: useMobileFormat ? 0 : 3, width: useMobileFormat ? "100%" : undefined }}
    >
      {!useMobileFormat && (
        <TimelineOppositeContent sx={{ alignSelf: "center" }}>
          {event.timestamp && dateChip}
        </TimelineOppositeContent>
      )}
      <TimelineSeparator>
        <TimelineDot color="primary">
          <MdiIcon path={icon} sx={{ color: "inherit" }} />
        </TimelineDot>
        <TimelineConnector />
      </TimelineSeparator>
      <TimelineContent sx={{ py: 0, px: 2 }}>
        {linkToRecipe
          ? (
              <Card component={Link} to={`/g/${groupSlug}/r/${recipe.slug}`} sx={cardSx}>
                {cardContent}
              </Card>
            )
          : (
              <Card sx={cardSx} onClick={() => onSelected?.()}>
                {cardContent}
              </Card>
            )}
      </TimelineContent>
    </TimelineItem>
  );
}
