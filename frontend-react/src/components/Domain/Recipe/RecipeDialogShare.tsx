import { useEffect, useState } from "react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import IconButton from "@mui/material/IconButton";
import ListItemButton from "@mui/material/ListItemButton";
import Popover from "@mui/material/Popover";
import Typography from "@mui/material/Typography";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import { useParams } from "react-router";
import type { RecipeShareToken } from "~/lib/api/types/recipe";
import { icons } from "~/lib/icons";
import { copyToClipboard, isClipboardSupported } from "~/lib/clipboard";
import { useUserApi } from "~/hooks/api";
import { useI18n } from "~/hooks/use-global-i18n";
import { useMealieAuth } from "~/hooks/use-mealie-auth";
import { alert } from "~/hooks/use-toast";
import { BaseButton } from "~/components/global/BaseButton";
import { BaseDialog } from "~/components/global/BaseDialog";
import { Icon } from "~/components/global/Icon";
import { TextInput } from "~/components/global/form";

export interface RecipeDialogShareProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipeId: string;
  name: string;
}

export function RecipeDialogShare({ open, onOpenChange, recipeId, name }: RecipeDialogShareProps) {
  const i18n = useI18n();
  const auth = useMealieAuth();
  const params = useParams();
  const groupSlug = params.groupSlug || auth.user?.groupSlug || "";
  const userApi = useUserApi();
  const [dateAnchor, setDateAnchor] = useState<HTMLElement | null>(null);
  const [expirationDate, setExpirationDate] = useState(new Date(Date.now() - new Date().getTimezoneOffset() * 60000));
  const [tokens, setTokens] = useState<RecipeShareToken[]>([]);

  async function refreshTokens() {
    const { data } = await userApi.recipes.share.getAll(1, -1, { recipe_id: recipeId });
    if (data) {
      // This route doesn't paginate, but the client types it as paginated.
      setTokens((data as unknown as RecipeShareToken[]) ?? []);
    }
  }

  useEffect(() => {
    if (!open) return;
    // Set expiration date to today + 30 Days
    setExpirationDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
    void refreshTokens();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- runs whenever the dialog opens
  }, [open]);

  async function createNewToken() {
    const { data } = await userApi.recipes.share.createOne({ recipeId, expiresAt: expirationDate.toISOString() });
    if (data) setTokens(prev => [...prev, data]);
  }

  async function deleteToken(id: string) {
    await userApi.recipes.share.deleteOne(id);
    setTokens(prev => prev.filter(token => token.id !== id));
  }

  const getTokenLink = (token: string) => `${window.location.origin}/g/${groupSlug}/shared/r/${token}`;

  async function copyTokenLink(token: string) {
    if (!isClipboardSupported()) {
      alert.error(i18n.t("general.clipboard-not-supported"));
      return;
    }
    const ok = await copyToClipboard(getTokenLink(token));
    if (ok) alert.success(i18n.t("recipe-share.recipe-link-copied-message"));
    else alert.error(i18n.t("general.clipboard-copy-failure"));
  }

  async function shareRecipe(token: string) {
    if (navigator.share) {
      await navigator.share({ title: name, url: getTokenLink(token) }).catch(() => undefined);
    }
    else {
      await copyTokenLink(token);
    }
  }

  return (
    <BaseDialog open={open} onOpenChange={onOpenChange} bottomSheet title={i18n.t("recipe-share.share-recipe")} icon={icons.link}>
      <CardContent>
        <Box onClick={e => setDateAnchor(e.currentTarget)}>
          <TextInput
            value={i18n.d(expirationDate)}
            label={i18n.t("recipe-share.expiration-date")}
            hint={i18n.t("recipe-share.default-30-days")}
            persistentHint
            prependIcon={icons.calendar}
            readOnly
          />
        </Box>
        <Popover open={!!dateAnchor} anchorEl={dateAnchor} onClose={() => setDateAnchor(null)} anchorOrigin={{ vertical: "bottom", horizontal: "left" }}>
          <DateCalendar
            value={expirationDate}
            onChange={(d: Date | null) => {
              if (d) setExpirationDate(d);
              setDateAnchor(null);
            }}
          />
        </Popover>
      </CardContent>
      <CardActions sx={{ justifyContent: "flex-end" }}>
        <BaseButton small onClick={() => void createNewToken()}>{i18n.t("general.new")}</BaseButton>
      </CardActions>
      {tokens.map(token => (
        <ListItemButton key={token.id} sx={{ px: 1, py: 1 }} onClick={() => void shareRecipe(token.id)}>
          <Box sx={{ display: "flex", alignItems: "center", width: "100%" }}>
            <Avatar sx={{ bgcolor: "grey.500" }}><Icon path={icons.link} /></Avatar>
            <Box sx={{ pl: 1.5, flexGrow: 1, minWidth: 0 }}>
              <Typography sx={{ whiteSpace: "normal" }}>
                {i18n.t("recipe-share.expires-at") + " " + i18n.d(new Date(token.expiresAt!))}
              </Typography>
            </Box>
            <IconButton
              sx={{ ml: 1 }}
              onClick={(e) => {
                e.stopPropagation();
                void deleteToken(token.id);
              }}
            >
              <Icon path={icons.delete} color="error" />
            </IconButton>
            <IconButton
              sx={{ ml: 1 }}
              onClick={(e) => {
                e.stopPropagation();
                void copyTokenLink(token.id);
              }}
            >
              <Icon path={icons.contentCopy} color="info" />
            </IconButton>
          </Box>
        </ListItemButton>
      ))}
    </BaseDialog>
  );
}

export default RecipeDialogShare;
