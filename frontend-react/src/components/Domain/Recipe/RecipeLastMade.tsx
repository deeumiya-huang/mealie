import { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CardContent from "@mui/material/CardContent";
import Checkbox from "@mui/material/Checkbox";
import Grid from "@mui/material/Grid";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Popover from "@mui/material/Popover";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import { formatISO } from "date-fns";
import { icons } from "~/lib/icons";
import type { Recipe, RecipeTimelineEventIn, RecipeTimelineEventOut } from "~/lib/api/types/recipe";
import { useUserApi } from "~/hooks/api";
import { useI18n } from "~/hooks/use-global-i18n";
import { useMealieAuth } from "~/hooks/use-mealie-auth";
import { alert } from "~/hooks/use-toast";
import { AppButtonUpload } from "~/components/global/AppButtonUpload";
import { BaseDialog } from "~/components/global/BaseDialog";
import { Icon } from "~/components/global/Icon";
import { ImageCropper } from "~/components/global/ImageCropper";
import { TextInput } from "~/components/global/form";

export interface RecipeLastMadeProps {
  recipe: Recipe;
  className?: string;
  onEventCreated?: (event: RecipeTimelineEventOut) => void;
}

export function RecipeLastMade({ recipe, className, onEventCreated }: RecipeLastMadeProps) {
  const i18n = useI18n();
  const auth = useMealieAuth();
  const userApi = useUserApi();
  const [madeThisDialog, setMadeThisDialog] = useState(false);
  const [eventMessage, setEventMessage] = useState("");
  const [image, setImage] = useState<Blob | File>();
  const [imageName, setImageName] = useState("");
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>();
  const [timestamp, setTimestamp] = useState<Date>(new Date());
  const [dateAnchor, setDateAnchor] = useState<HTMLElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastMade, setLastMade] = useState(recipe.lastMade);
  const [lastMadeReady, setLastMadeReady] = useState(false);

  const childRecipesInitial = useMemo(() => (recipe.recipeIngredient ?? [])
    .filter(ingredient => ingredient.referencedRecipe)
    .map(ingredient => ({
      checked: false, // Default value for checked
      recipeId: ingredient.referencedRecipe!.id || "",
      ...ingredient.referencedRecipe!,
    })), [recipe.recipeIngredient]);
  const [childRecipes, setChildRecipes] = useState(childRecipesInitial);
  useEffect(() => setChildRecipes(childRecipesInitial), [childRecipesInitial]);

  useEffect(() => {
    async function load() {
      if (!auth.user?.householdSlug) {
        setLastMade(recipe.lastMade);
      }
      else {
        const { data } = await userApi.households.getCurrentUserHouseholdRecipe(recipe.slug || "");
        setLastMade(data?.lastMade);
      }
      setLastMadeReady(true);
    }
    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- onMounted
  }, []);

  useEffect(() => {
    if (madeThisDialog) setTimestamp(new Date()); // Set timestamp to now
  }, [madeThisDialog]);

  function clearImage() {
    setImage(undefined);
    setImageName("");
    setImagePreviewUrl(undefined);
  }

  function resetMadeThisForm() {
    setLoading(false);
    setEventMessage("");
    clearImage();
    setMadeThisDialog(false);
  }

  async function createTimelineEvent() {
    const timestampString = formatISO(timestamp, { representation: "date" });
    if (!(timestampString && recipe?.id && recipe?.slug)) return;

    setLoading(true);
    // the user only selects the date, so we set the time to end of day local time
    // we choose the end of day so it always comes after "new recipe" events
    const eventTimestamp = new Date(timestampString + "T23:59:59").toISOString();
    const newTimelineEvent: RecipeTimelineEventIn = {
      recipeId: recipe.id,
      subject: i18n.t("recipe.user-made-this", { user: auth.user?.fullName }),
      eventType: "comment",
      eventMessage,
      timestamp: eventTimestamp,
    };

    let newEvent: RecipeTimelineEventOut | null;
    try {
      const eventResponse = await userApi.recipes.createTimelineEvent(newTimelineEvent);
      newEvent = eventResponse.data;
      if (!newEvent) throw new Error("No event created");
    }
    catch (error) {
      console.error("Failed to create timeline event:", error);
      alert.error(i18n.t("recipe.failed-to-add-to-timeline"));
      resetMadeThisForm();
      return;
    }

    // we also update the recipe's last made value
    if (!lastMade || eventTimestamp > lastMade) {
      try {
        setLastMade(eventTimestamp);
        await userApi.recipes.updateLastMade(recipe.slug, eventTimestamp);
      }
      catch (error) {
        console.error("Failed to update last made date:", error);
        alert.error(i18n.t("recipe.failed-to-update-recipe"));
      }
    }

    for (const childRecipe of childRecipes) {
      if (!childRecipe.checked) continue;
      const childTimelineEvent = {
        ...newTimelineEvent,
        recipeId: childRecipe.recipeId,
        eventMessage: i18n.t("recipe.made-for-recipe", { recipe: childRecipe.name }),
        image: undefined,
      };
      try {
        await userApi.recipes.createTimelineEvent(childTimelineEvent);
      }
      catch (error) {
        console.error(`Failed to create timeline event for child recipe ${childRecipe.slug}:`, error);
      }
      if (!childRecipe.lastMade || eventTimestamp > childRecipe.lastMade) {
        try {
          await userApi.recipes.updateLastMade(childRecipe.slug || "", eventTimestamp);
        }
        catch (error) {
          console.error(`Failed to update last made date for child recipe ${childRecipe.slug}:`, error);
        }
      }
    }

    // update the image, if provided
    let imageError = false;
    if (image) {
      try {
        const imageResponse = await userApi.recipes.updateTimelineEventImage(newEvent.id, image, imageName);
        if (imageResponse.data) newEvent.image = imageResponse.data.image as RecipeTimelineEventOut["image"];
      }
      catch (error) {
        imageError = true;
        console.error("Failed to upload image for timeline event:", error);
      }
    }
    if (imageError) alert.error(i18n.t("recipe.added-to-timeline-but-failed-to-add-image"));
    else alert.success(i18n.t("recipe.added-to-timeline"));

    resetMadeThisForm();
    onEventCreated?.(newEvent);
  }

  return (
    <Box className={className}>
      <BaseDialog
        open={madeThisDialog}
        onOpenChange={setMadeThisDialog}
        bottomSheet
        loading={loading}
        icon={icons.chefHat}
        title={i18n.t("recipe.made-this")}
        submitText={i18n.t("recipe.add-to-timeline")}
        canSubmit
        disableSubmitOnEnter
        keepOpen
        onSubmit={() => void createTimelineEvent()}
      >
        <CardContent>
          <TextInput
            value={eventMessage}
            onChange={setEventMessage}
            autoFocus
            label={i18n.t("recipe.comment")}
            hint={i18n.t("recipe.how-did-it-turn-out")}
            persistentHint
            multiline
            rows={4}
          />
          {childRecipes.length > 0 && (
            <div>
              <Typography variant="subtitle1" sx={{ pt: 3, px: 2 }}>{i18n.t("recipe.include-linked-recipes")}</Typography>
              <List>
                {childRecipes.map((childRecipe, i) => (
                  <ListItemButton
                    key={childRecipe.recipeId + i}
                    dense
                    onClick={() => setChildRecipes(prev => prev.map((c, j) => (j === i ? { ...c, checked: !c.checked } : c)))}
                  >
                    <Checkbox size="small" checked={childRecipe.checked} color="secondary" />
                    <ListItemText primary={childRecipe.name} />
                  </ListItemButton>
                ))}
              </List>
            </div>
          )}
          <Grid container spacing={2} sx={{ mt: 2, alignItems: "center" }}>
            <Grid size={5}>
              <Box onClick={e => setDateAnchor(e.currentTarget)}>
                <TextInput value={i18n.d(timestamp)} prependIcon={icons.calendar} readOnly density="compact" />
              </Box>
              <Popover open={!!dateAnchor} anchorEl={dateAnchor} onClose={() => setDateAnchor(null)}>
                <DateCalendar
                  value={timestamp}
                  onChange={(d: Date | null) => {
                    if (d) setTimestamp(d);
                    setDateAnchor(null);
                  }}
                />
              </Popover>
            </Grid>
            <Box sx={{ flex: 1 }} />
            <Grid size="auto">
              {!image
                ? (
                    <AppButtonUpload
                      url="none"
                      fileName="image"
                      accept="image/*"
                      text={i18n.t("recipe.upload-image")}
                      textBtn={false}
                      post={false}
                      onUploaded={(file) => {
                        const f = file as File;
                        setImage(f);
                        setImageName(f.name);
                        setImagePreviewUrl(URL.createObjectURL(f));
                      }}
                    />
                  )
                : (
                    <Button color="error" variant="contained" onClick={clearImage} startIcon={<Icon path={icons.close} />}>
                      {i18n.t("recipe.remove-image")}
                    </Button>
                  )}
            </Grid>
            {image && imagePreviewUrl && (
              <Grid size={12}>
                <ImageCropper
                  img={imagePreviewUrl}
                  cropperWidth="100%"
                  onSave={(blob) => {
                    setImage(blob);
                    setImagePreviewUrl(URL.createObjectURL(blob));
                  }}
                />
              </Grid>
            )}
          </Grid>
        </CardContent>
      </BaseDialog>
      {lastMadeReady && (
        <Box sx={{ display: "flex", justifyContent: "center", flexWrap: "wrap", fontSize: "larger" }}>
          <Tooltip title={i18n.t("recipe.made-this")} placement="bottom">
            <Button
              variant="outlined"
              size="large"
              sx={{ borderRadius: 6, borderColor: "primary.main", color: "text.primary", fontWeight: 400, textAlign: "start" }}
              onClick={() => setMadeThisDialog(true)}
              startIcon={<Icon path={icons.calendar} size="large" color="primary" />}
              endIcon={<Icon path={icons.createAlt} size="large" color="primary" />}
            >
              <span style={{ opacity: 0.8 }}>
                <strong>{i18n.t("general.last-made")}</strong>
                <br />
                {lastMade ? i18n.d(new Date(lastMade)) : i18n.t("general.never")}
              </span>
            </Button>
          </Tooltip>
        </Box>
      )}
    </Box>
  );
}

export default RecipeLastMade;
