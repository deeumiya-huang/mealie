// Usage: <RecipePageComments recipe={recipe} onChange={update} /> — the comments of a recipe: a box to write one
// (logged-in users) and the list, each deletable by its author or an admin. (Vue `v-model` → `recipe` + `onChange`.)
import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { SxProps, Theme } from "@mui/material/styles";
import { UserAvatar } from "@/components/Domain/User/UserAvatar";
import { BaseButton } from "@/components/global/BaseButton";
import { MdiIcon } from "@/components/global/MdiIcon";
import { SafeMarkdown } from "@/components/global/SafeMarkdown";
import { useUserApi } from "@/hooks/api";
import { usePageUser } from "@/hooks/recipe-page/shared-state";
import { useI18n } from "@/i18n";
import { icons } from "@/lib/icons";
import type { RecipeChange, RecipeModel } from "../recipe-model";

interface RecipePageCommentsProps {
  recipe: RecipeModel;
  onChange: RecipeChange;
  sx?: SxProps<Theme>;
}

export function RecipePageComments({ recipe, onChange, sx }: RecipePageCommentsProps) {
  const { t, d } = useI18n();
  const api = useUserApi();
  const { user } = usePageUser();
  const [comment, setComment] = useState("");

  async function submitComment() {
    const text = comment.trim();
    if (!text) {
      return;
    }
    const { data } = await api.recipes.comments.createOne({
      recipeId: recipe.id,
      text,
    });

    if (data) {
      onChange(prev => ({ ...prev, comments: [...(prev.comments ?? []), data as RecipeModel["comments"][number]] }));
    }

    setComment("");
  }

  async function deleteComment(id: string) {
    const { response } = await api.recipes.comments.deleteOne(id);

    if (response?.status === 200) {
      onChange(prev => ({ ...prev, comments: (prev.comments ?? []).filter(item => item.id !== id) }));
    }
  }

  return (
    <Box sx={sx}>
      <Typography variant="h6" component="div" sx={{ display: "flex", alignItems: "center", px: 2, pt: 2, pb: 1.5 }}>
        <MdiIcon path={icons.commentTextMultipleOutline} sx={{ mr: 1 }} />
        {t("recipe.comments")}
      </Typography>
      <Divider sx={{ mx: 1 }} />
      {!!user.id && (
        <Box sx={{ display: "flex", flexDirection: "column" }}>
          <Box sx={{ display: "flex", mt: 1.5, gap: "10px" }}>
            <UserAvatar tooltip={false} size="40" userId={user.id} />

            <TextField
              value={comment}
              onChange={event => setComment(event.target.value)}
              size="small"
              variant="outlined"
              multiline
              minRows={2}
              fullWidth
              hiddenLabel
              placeholder={t("recipe.join-the-conversation")}
            />
          </Box>
          <Box sx={{ ml: "auto", mt: 0.5 }}>
            <BaseButton
              small
              disabled={!comment.trim()}
              icon={icons.check}
              onClick={() => void submitComment()}
            >
              {t("general.submit")}
            </BaseButton>
          </Box>
        </Box>
      )}
      {(recipe.comments ?? []).map(recipeComment => (
        <Box key={recipeComment.id} sx={{ display: "flex", my: 1, gap: "10px" }}>
          <UserAvatar tooltip={false} size="40" userId={recipeComment.userId} />
          <Card variant="outlined" sx={{ flexGrow: 1 }}>
            <CardContent sx={{ p: 1.5, pb: 0 }}>
              <p>
                {recipeComment.user.fullName}
                {" • "}
                {d(Date.parse(recipeComment.createdAt), "medium")}
              </p>
              <SafeMarkdown source={recipeComment.text} />
            </CardContent>
            <CardActions sx={{ justifyContent: "flex-end", mt: 0, pt: 0 }}>
              {(user.id == recipeComment.user.id || user.admin) && (
                <Button
                  color="error"
                  variant="text"
                  size="small"
                  onClick={() => void deleteComment(recipeComment.id)}
                >
                  {t("general.delete")}
                </Button>
              )}
            </CardActions>
          </Card>
        </Box>
      ))}
    </Box>
  );
}
