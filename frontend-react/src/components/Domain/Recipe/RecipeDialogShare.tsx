// Usage: <RecipeDialogShare open={open} onOpenChange={setOpen} recipeId={recipe.id} name={recipe.name} />
// Dialog listing the recipe's share tokens: pick an expiration date and create a new token, click a token to
// share its link (or copy it when the browser can't share), or delete / copy it with the row buttons.
import { useEffect, useState } from "react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import ListItemButton from "@mui/material/ListItemButton";
import Popover from "@mui/material/Popover";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import { useParams } from "react-router";
import { BaseButton } from "@/components/global/BaseButton";
import { BaseDialog } from "@/components/global/BaseDialog";
import { MdiIcon } from "@/components/global/MdiIcon";
import { useUserApi } from "@/hooks/api";
import { useHouseholdSelf } from "@/hooks/use-households";
import { useMealieAuth } from "@/hooks/use-mealie-auth";
import { alert } from "@/hooks/use-toast";
import { useClipboard } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import type { RecipeShareToken } from "@/lib/api/types/recipe";
import { icons } from "@/lib/icons";
import { WeekStartLocalization } from "@/components/Domain/Mealplan/WeekStartLocalization";

interface RecipeDialogShareProps {
  recipeId: string;
  name: string;
  open: boolean;
  onOpenChange?: (open: boolean) => void;
}

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

export function RecipeDialogShare({ recipeId, name, open, onOpenChange }: RecipeDialogShareProps) {
  const { t, d } = useI18n();
  const auth = useMealieAuth();
  const { household } = useHouseholdSelf();
  const params = useParams();
  const userApi = useUserApi();
  const { copy } = useClipboard();

  const [datePickerAnchor, setDatePickerAnchor] = useState<HTMLElement | null>(null);
  const [expirationDate, setExpirationDate] = useState(() => new Date(Date.now() - new Date().getTimezoneOffset() * 60000));
  const [tokens, setTokens] = useState<RecipeShareToken[]>([]);

  const groupSlug = params.groupSlug || auth.user?.groupSlug || "";
  const firstDayOfWeek = household?.preferences?.firstDayOfWeek || 0;

  // When the dialog opens: the expiration date is today + 30 days and the tokens are reloaded.
  useEffect(() => {
    if (!open) return;
    let active = true;
    async function refresh() {
      setExpirationDate(new Date(Date.now() + THIRTY_DAYS));
      const { data } = await userApi.recipes.share.getAll(1, -1, { recipe_id: recipeId });
      // this route has no pagination, but the generated type says it has
      if (active && data) {
        setTokens(Array.isArray(data) ? (data as unknown as RecipeShareToken[]) : []);
      }
    }
    void refresh();
    return () => {
      active = false;
    };
  }, [open, recipeId, userApi]);

  // ============================================================
  // Token Actions

  async function createNewToken() {
    // Convert expiration date to timestamp
    const { data } = await userApi.recipes.share.createOne({
      recipeId,
      expiresAt: expirationDate.toISOString(),
    });

    if (data) {
      setTokens(current => [...current, data]);
    }
  }

  async function deleteToken(id: string) {
    await userApi.recipes.share.deleteOne(id);
    setTokens(current => current.filter(token => token.id !== id));
  }

  function getTokenLink(token: string) {
    return `${window.location.origin}/g/${groupSlug}/shared/r/${token}`;
  }

  async function copyTokenLink(token: string) {
    await copy(getTokenLink(token));
    alert.success(t("recipe-share.recipe-link-copied-message"));
  }

  async function shareRecipe(token: string) {
    if (typeof navigator.share === "function") {
      await navigator.share({
        title: name,
        url: getTokenLink(token),
      });
    }
    else {
      await copyTokenLink(token);
    }
  }

  return (
    <BaseDialog
      open={open}
      onOpenChange={onOpenChange}
      bottomSheet
      title={t("recipe-share.share-recipe")}
      icon={icons.link}
    >
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
          <MdiIcon path={icons.calendar} sx={{ mt: 2, color: "text.secondary" }} />
          <TextField
            fullWidth
            variant="standard"
            value={d(expirationDate)}
            label={t("recipe-share.expiration-date")}
            helperText={t("recipe-share.default-30-days")}
            onClick={event => setDatePickerAnchor(event.currentTarget)}
            slotProps={{
              input: {
                readOnly: true,
                endAdornment: <InputAdornment position="end" />,
              },
              formHelperText: { sx: { opacity: 1 } },
            }}
          />
          <Popover
            open={datePickerAnchor !== null}
            anchorEl={datePickerAnchor}
            onClose={() => setDatePickerAnchor(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
            slotProps={{ paper: { sx: { maxWidth: 290 } } }}
          >
            <WeekStartLocalization firstDayOfWeek={firstDayOfWeek}>
              <DateCalendar
                value={expirationDate}
                onChange={(value) => {
                  if (value) setExpirationDate(value);
                  setDatePickerAnchor(null);
                }}
              />
            </WeekStartLocalization>
          </Popover>
        </Box>
      </CardContent>
      <CardActions sx={{ justifyContent: "flex-end" }}>
        <BaseButton small onClick={() => void createNewToken()}>
          {t("general.new")}
        </BaseButton>
      </CardActions>

      {tokens.map(token => (
        <ListItemButton
          key={token.id}
          sx={{ px: 1, py: 1 }}
          onClick={() => void shareRecipe(token.id)}
        >
          <Box sx={{ display: "flex", alignItems: "center", width: "100%" }}>
            <Avatar sx={{ bgcolor: "grey.500", color: "#fff" }}>
              <MdiIcon path={icons.link} />
            </Avatar>

            <Box sx={{ pl: 1.5, flexGrow: 1, minWidth: 0 }}>
              <Typography variant="body1" sx={{ whiteSpace: "normal" }}>
                {t("recipe-share.expires-at") + " " + d(new Date(token.expiresAt ?? ""))}
              </Typography>
            </Box>

            <IconButton
              aria-label={t("general.delete")}
              sx={{ ml: 1 }}
              onClick={(event) => {
                event.stopPropagation();
                void deleteToken(token.id);
              }}
            >
              <MdiIcon path={icons.delete} sx={{ color: "error.light" }} />
            </IconButton>
            <IconButton
              aria-label={t("general.copy")}
              sx={{ ml: 1 }}
              onClick={(event) => {
                event.stopPropagation();
                void copyTokenLink(token.id);
              }}
            >
              <MdiIcon path={icons.contentCopy} sx={{ color: "info.light" }} />
            </IconButton>
          </Box>
        </ListItemButton>
      ))}
    </BaseDialog>
  );
}
