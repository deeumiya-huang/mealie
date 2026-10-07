// Usage: <RecipeLastMade recipe={recipe} onEventCreated={event => …} /> — the "Last Made" button of the recipe info
// card, opening the "I Made This" dialog: a comment, the date, an optional (croppable) photo and linked sub-recipes;
// submitting adds a timeline event and updates the last-made date. (Vue `@eventCreated` → `onEventCreated`.)
import { useEffect, useState, type FormEvent, type MouseEvent } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CardContent from "@mui/material/CardContent";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid";
import InputAdornment from "@mui/material/InputAdornment";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Popover from "@mui/material/Popover";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import { formatISO } from "date-fns";
import { WeekStartLocalization } from "@/components/Domain/Mealplan/WeekStartLocalization";
import { AppButtonUpload } from "@/components/global/AppButtonUpload";
import { BaseDialog } from "@/components/global/BaseDialog";
import { ImageCropper } from "@/components/global/ImageCropper";
import { MdiIcon } from "@/components/global/MdiIcon";
import { useUserApi } from "@/hooks/api";
import { useHouseholdSelf } from "@/hooks/use-households";
import { useMealieAuth } from "@/hooks/use-mealie-auth";
import { alert } from "@/hooks/use-toast";
import { useI18n } from "@/i18n";
import type { Recipe, RecipeTimelineEventIn, RecipeTimelineEventOut } from "@/lib/api/types/recipe";
import { icons } from "@/lib/icons";

interface RecipeLastMadeProps {
  recipe: Recipe;
  className?: string;
  onEventCreated?: (event: RecipeTimelineEventOut) => void;
}

export function RecipeLastMade({ recipe, className, onEventCreated }: RecipeLastMadeProps) {
  const { t, d } = useI18n();
  const userApi = useUserApi();
  const { household } = useHouseholdSelf();
  const auth = useMealieAuth();

  const [madeThisDialog, setMadeThisDialog] = useState(false);
  const [eventMessage, setEventMessage] = useState("");
  const [newTimelineEventImage, setNewTimelineEventImage] = useState<Blob | File>();
  const [newTimelineEventImageName, setNewTimelineEventImageName] = useState("");
  const [newTimelineEventImagePreviewUrl, setNewTimelineEventImagePreviewUrl] = useState<string>();
  const [newTimelineEventTimestamp, setNewTimelineEventTimestamp] = useState<Date>(() => new Date());
  const newTimelineEventTimestampString = formatISO(newTimelineEventTimestamp, { representation: "date" });

  // Vue: lastMade = recipe.lastMade, replaced on mount by the user's household's value when there is one
  const householdSlug = auth.user?.householdSlug;
  const [householdLastMade, setHouseholdLastMade] = useState<{ value: string | null | undefined } | null>(null);
  const [createdLastMade, setCreatedLastMade] = useState<string | null>(null);
  useEffect(() => {
    if (!householdSlug) {
      return;
    }
    let active = true;
    void (async () => {
      const { data } = await userApi.households.getCurrentUserHouseholdRecipe(recipe.slug || "");
      if (active) {
        setHouseholdLastMade({ value: data?.lastMade });
      }
    })();
    return () => {
      active = false;
    };
    // runs on mount only, like onMounted
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const lastMade = createdLastMade ?? (householdSlug ? householdLastMade?.value : recipe.lastMade);
  const lastMadeReady = !householdSlug || householdLastMade !== null;

  const childRecipes = (recipe.recipeIngredient ?? []).flatMap((ingredient) => {
    if (ingredient.referencedRecipe) {
      return [{
        recipeId: ingredient.referencedRecipe.id || "", // Non-nullable recipeId
        ...ingredient.referencedRecipe, // Spread the rest of the referencedRecipe properties
      }];
    }
    return [];
  });
  const [checkedChildren, setCheckedChildren] = useState<Record<number, boolean>>({});

  const firstDayOfWeek = household?.preferences?.firstDayOfWeek || 0;

  function clearImage() {
    setNewTimelineEventImage(undefined);
    setNewTimelineEventImageName("");
    setNewTimelineEventImagePreviewUrl(undefined);
  }

  function uploadImage(fileObject: File) {
    setNewTimelineEventImage(fileObject);
    setNewTimelineEventImageName(fileObject.name);
    setNewTimelineEventImagePreviewUrl(URL.createObjectURL(fileObject));
  }

  function updateUploadedImage(fileObject: Blob) {
    setNewTimelineEventImage(fileObject);
    setNewTimelineEventImagePreviewUrl(URL.createObjectURL(fileObject));
  }

  const [datePickerAnchor, setDatePickerAnchor] = useState<HTMLElement | null>(null);
  const [madeThisFormLoading, setMadeThisFormLoading] = useState(false);

  function resetMadeThisForm() {
    setMadeThisFormLoading(false);
    setEventMessage("");
    clearImage();
    setMadeThisDialog(false);
  }

  function openMadeThisDialog() {
    // Set timestamp to now (Vue: whenever(madeThisDialog))
    setNewTimelineEventTimestamp(new Date());
    setMadeThisDialog(true);
  }

  async function createTimelineEvent() {
    if (!(newTimelineEventTimestampString && recipe?.id && recipe?.slug)) {
      return;
    }

    setMadeThisFormLoading(true);

    const newTimelineEvent: RecipeTimelineEventIn = {
      recipeId: recipe.id,
      subject: t("recipe.user-made-this", { user: auth.user?.fullName }),
      eventType: "comment",
      eventMessage,
      // the user only selects the date, so we set the time to end of day local time
      // we choose the end of day so it always comes after "new recipe" events
      timestamp: new Date(newTimelineEventTimestampString + "T23:59:59").toISOString(),
    };
    const timestamp = newTimelineEvent.timestamp!;

    let newEvent: RecipeTimelineEventOut | null;
    try {
      const eventResponse = await userApi.recipes.createTimelineEvent(newTimelineEvent);
      newEvent = eventResponse.data;
      if (!newEvent) {
        throw new Error("No event created");
      }
    }
    catch (error) {
      console.error("Failed to create timeline event:", error);
      alert.error(t("recipe.failed-to-add-to-timeline"));
      resetMadeThisForm();
      return;
    }

    // we also update the recipe's last made value
    if (!lastMade || timestamp > lastMade) {
      try {
        setCreatedLastMade(timestamp);
        await userApi.recipes.updateLastMade(recipe.slug, timestamp);
      }
      catch (error) {
        console.error("Failed to update last made date:", error);
        alert.error(t("recipe.failed-to-update-recipe"));
      }
    }

    for (const [index, childRecipe] of childRecipes.entries()) {
      if (!checkedChildren[index]) {
        continue;
      }

      const childTimelineEvent = {
        ...newTimelineEvent,
        recipeId: childRecipe.recipeId,
        eventMessage: t("recipe.made-for-recipe", { recipe: childRecipe.name }),
        image: undefined,
      };
      try {
        await userApi.recipes.createTimelineEvent(childTimelineEvent);
      }
      catch (error) {
        console.error(`Failed to create timeline event for child recipe ${childRecipe.slug}:`, error);
      }

      if (!childRecipe.lastMade || timestamp > childRecipe.lastMade) {
        try {
          await userApi.recipes.updateLastMade(childRecipe.slug || "", timestamp);
        }
        catch (error) {
          console.error(`Failed to update last made date for child recipe ${childRecipe.slug}:`, error);
        }
      }
    }

    // update the image, if provided
    let imageError = false;
    if (newTimelineEventImage) {
      try {
        const imageResponse = await userApi.recipes.updateTimelineEventImage(
          newEvent.id,
          newTimelineEventImage,
          newTimelineEventImageName,
        );
        if (imageResponse.data) {
          // the upload answers with the new image name (Vue assigned it as is)
          newEvent.image = imageResponse.data.image as RecipeTimelineEventOut["image"];
        }
      }
      catch (error) {
        imageError = true;
        console.error("Failed to upload image for timeline event:", error);
      }
    }
    if (imageError) {
      alert.error(t("recipe.added-to-timeline-but-failed-to-add-image"));
    }
    else {
      alert.success(t("recipe.added-to-timeline"));
    }

    resetMadeThisForm();
    onEventCreated?.(newEvent);
  }

  return (
    <div className={className}>
      <div>
        <BaseDialog
          open={madeThisDialog}
          onOpenChange={setMadeThisDialog}
          bottomSheet
          loading={madeThisFormLoading}
          icon={icons.chefHat}
          title={t("recipe.made-this")}
          submitText={t("recipe.add-to-timeline")}
          canSubmit
          disableSubmitOnEnter
          onSubmit={() => void createTimelineEvent()}
        >
          <CardContent>
            <form onSubmit={(event: FormEvent) => event.preventDefault()}>
              <TextField
                value={eventMessage}
                onChange={event => setEventMessage(event.target.value)}
                autoFocus
                label={t("recipe.comment")}
                helperText={t("recipe.how-did-it-turn-out")}
                multiline
                rows={4}
                variant="filled"
                fullWidth
              />
              {childRecipes.length > 0 && (
                <div>
                  <Typography variant="subtitle1" component="div" sx={{ pt: 3, pb: 0, px: 2 }}>
                    {t("recipe.include-linked-recipes")}
                  </Typography>
                  <List>
                    {childRecipes.map((childRecipe, i) => (
                      <ListItem key={childRecipe.recipeId + i} dense sx={{ my: 0, py: 0 }}>
                        <FormControlLabel
                          sx={{ my: 0, py: 0 }}
                          label={childRecipe.name}
                          control={(
                            <Checkbox
                              size="small"
                              color="secondary"
                              checked={!!checkedChildren[i]}
                              onChange={event => setCheckedChildren(prev => ({ ...prev, [i]: event.target.checked }))}
                            />
                          )}
                        />
                      </ListItem>
                    ))}
                  </List>
                </div>
              )}
              <Box sx={{ p: 2 }}>
                <Grid container sx={{ mt: 2, alignItems: "center" }} spacing={2}>
                  <Grid size={5}>
                    <TextField
                      value={d(newTimelineEventTimestamp)}
                      size="small"
                      variant="filled"
                      sx={{ minWidth: 160 }}
                      onClick={(event: MouseEvent<HTMLElement>) => setDatePickerAnchor(event.currentTarget)}
                      slotProps={{
                        input: {
                          readOnly: true,
                          startAdornment: (
                            <InputAdornment position="start">
                              <MdiIcon path={icons.calendar} />
                            </InputAdornment>
                          ),
                        },
                      }}
                    />
                    <Popover
                      open={!!datePickerAnchor}
                      anchorEl={datePickerAnchor}
                      onClose={() => setDatePickerAnchor(null)}
                      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                    >
                      <WeekStartLocalization firstDayOfWeek={firstDayOfWeek}>
                        <DateCalendar
                          value={newTimelineEventTimestamp}
                          onChange={(value: Date | null) => {
                            if (value) {
                              setNewTimelineEventTimestamp(value);
                            }
                            setDatePickerAnchor(null);
                          }}
                        />
                      </WeekStartLocalization>
                    </Popover>
                  </Grid>
                  <Box sx={{ flexGrow: 1 }} />
                  <Grid size="auto">
                    {!newTimelineEventImage && (
                      <AppButtonUpload
                        url="none"
                        fileName="image"
                        accept="image/*"
                        text={t("recipe.upload-image")}
                        textBtn={false}
                        post={false}
                        onUploaded={(payload) => {
                          if (payload instanceof File) {
                            uploadImage(payload);
                          }
                        }}
                      />
                    )}
                    {!!newTimelineEventImage && (
                      <Button color="error" variant="contained" startIcon={<MdiIcon path={icons.close} />} onClick={clearImage}>
                        {t("recipe.remove-image")}
                      </Button>
                    )}
                  </Grid>
                </Grid>
                {newTimelineEventImage && newTimelineEventImagePreviewUrl && (
                  <Grid container>
                    <Grid size={12}>
                      <ImageCropper
                        img={newTimelineEventImagePreviewUrl}
                        cropperWidth="100%"
                        onSave={updateUploadedImage}
                      />
                    </Grid>
                  </Grid>
                )}
              </Box>
            </form>
          </CardContent>
        </BaseDialog>
      </div>
      <div>
        {lastMadeReady && (
          <Box sx={{ display: "flex", justifyContent: "center", flexWrap: "wrap" }}>
            <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", fontSize: "larger" }}>
              <Tooltip title={t("recipe.made-this")} placement="bottom" describeChild>
                <Button
                  variant="outlined"
                  size="large"
                  sx={{ borderRadius: 28, borderColor: "primary.main", fontWeight: 400, textTransform: "none", color: "text.primary", lineHeight: 1.3 }}
                  startIcon={<MdiIcon path={icons.calendar} size="large" sx={{ color: "primary.main" }} />}
                  endIcon={<MdiIcon path={icons.createAlt} size="large" sx={{ color: "primary.main" }} />}
                  onClick={openMadeThisDialog}
                >
                  <Box component="span" sx={{ opacity: 0.8 }}>
                    <strong>{t("general.last-made")}</strong>
                    <br />
                    {lastMade ? d(new Date(lastMade)) : t("general.never")}
                  </Box>
                </Button>
              </Tooltip>
            </Box>
          </Box>
        )}
      </div>
    </div>
  );
}
