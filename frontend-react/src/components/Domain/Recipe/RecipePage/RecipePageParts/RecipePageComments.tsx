import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import type { SxProps, Theme } from "@mui/material/styles";
import { icons } from "~/lib/icons";
import type { NoUndefinedField } from "~/lib/api/types/non-generated";
import type { Recipe } from "~/lib/api/types/recipe";
import { useUserApi } from "~/hooks/api";
import { usePageUser } from "~/hooks/recipe-page/shared-state";
import { useI18n } from "~/hooks/use-global-i18n";
import { BaseButton } from "~/components/global/BaseButton";
import { Icon } from "~/components/global/Icon";
import { SafeMarkdown } from "~/components/global/SafeMarkdown";
import { TextInput } from "~/components/global/form";
import { UserAvatar } from "~/components/Domain/User/UserAvatar";

type R = NoUndefinedField<Recipe>;

export function RecipePageComments({ value: recipe, onChange, sx }: { value: R; onChange: (recipe: R | ((prev: R) => R)) => void; sx?: SxProps<Theme> }) {
  const i18n = useI18n();
  const api = useUserApi();
  const { user } = usePageUser();
  const [comment, setComment] = useState("");

  async function submitComment() {
    const text = comment.trim();
    if (!text) return;
    const { data } = await api.recipes.comments.createOne({ recipeId: recipe.id, text });
    if (data) onChange(prev => ({ ...prev, comments: [...prev.comments, data] as R["comments"] }));
    setComment("");
  }

  async function deleteComment(id: string) {
    const { response } = await api.recipes.comments.deleteOne(id);
    if (response?.status === 200) {
      onChange(prev => ({ ...prev, comments: prev.comments.filter(c => c.id !== id) }));
    }
  }

  return (
    <Box sx={sx}>
      <Typography variant="h5" sx={{ pb: 1.5, px: 2, pt: 2, display: "flex", alignItems: "center" }}>
        <Icon path={icons.commentTextMultipleOutline} sx={{ mr: 1 }} />
        {i18n.t("recipe.comments")}
      </Typography>
      <Divider sx={{ mx: 1 }} />
      {user.id && (
        <Box sx={{ display: "flex", flexDirection: "column" }}>
          <Box sx={{ display: "flex", mt: 1.5, gap: "10px" }}>
            <UserAvatar tooltip={false} size="40" userId={user.id} />
            <TextInput value={comment} onChange={setComment} hideDetails multiline autoGrow rows={2} placeholder={i18n.t("recipe.join-the-conversation")} />
          </Box>
          <Box sx={{ ml: "auto", mt: 0.5 }}>
            <BaseButton small disabled={!comment.trim()} onClick={() => void submitComment()} iconSlot={<Icon path={icons.check} />}>
              {i18n.t("general.submit")}
            </BaseButton>
          </Box>
        </Box>
      )}
      {recipe.comments.map(recipeComment => (
        <Box key={recipeComment.id} sx={{ display: "flex", my: 1, gap: "10px" }}>
          <UserAvatar tooltip={false} size="40" userId={recipeComment.userId} />
          <Card variant="outlined" sx={{ flexGrow: 1 }}>
            <CardContent sx={{ p: 1.5, pb: 0 }}>
              <p>{recipeComment.user.fullName} • {i18n.d(Date.parse(recipeComment.createdAt), "medium")}</p>
              <SafeMarkdown source={recipeComment.text} />
            </CardContent>
            <CardActions sx={{ justifyContent: "flex-end", mt: 0, pt: 0 }}>
              {(user.id === recipeComment.user.id || user.admin) && (
                <Button color="error" variant="text" size="small" onClick={() => void deleteComment(recipeComment.id)}>{i18n.t("general.delete")}</Button>
              )}
            </CardActions>
          </Card>
        </Box>
      ))}
    </Box>
  );
}

export default RecipePageComments;
