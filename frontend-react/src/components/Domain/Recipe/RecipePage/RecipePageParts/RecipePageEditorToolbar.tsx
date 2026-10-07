// Usage: <RecipePageEditorToolbar recipe={recipe} onChange={update} /> — the row above the edit form: image button,
// recipe settings and the owner select (editable by the owner and admins). (Vue `v-model` → `recipe` + `onChange`.)
import Box from "@mui/material/Box";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { RecipeImageUploadBtn } from "@/components/Domain/Recipe/RecipeImageUploadBtn";
import { RecipeSettingsMenu } from "@/components/Domain/Recipe/RecipeSettingsMenu";
import { UserAvatar } from "@/components/Domain/User/UserAvatar";
import { useUserApi } from "@/hooks/api";
import { usePageState, usePageUser } from "@/hooks/recipe-page/shared-state";
import { useHouseholdStore } from "@/hooks/store";
import { useUserStore } from "@/hooks/store/use-user-store";
import { alertUnreportedError } from "@/hooks/use-toast";
import { useI18n } from "@/i18n";
import type { RecipeChange, RecipeModel } from "../recipe-model";

interface RecipePageEditorToolbarProps {
  recipe: RecipeModel;
  onChange: RecipeChange;
}

export function RecipePageEditorToolbar({ recipe, onChange }: RecipePageEditorToolbarProps) {
  const { t } = useI18n();
  const { user } = usePageUser();
  const api = useUserApi();
  const { setImageKey } = usePageState(recipe.slug);

  const canEditOwner = user.id === recipe.userId || user.admin;

  const { store: allUsers } = useUserStore();
  const { store: households } = useHouseholdStore();

  function itemsProps(item: { id: string; fullName?: string | null }) {
    const owner = allUsers.find(u => u.id === item.id);
    return {
      value: item.id,
      title: item.fullName ?? "",
      subtitle: owner ? households.find(h => h.id === owner.householdId)?.name || "" : "",
    };
  }

  async function uploadImage(fileObject: File) {
    if (!recipe || !recipe.slug) {
      return;
    }
    const { data, error } = await api.recipes.updateImage(recipe.slug, fileObject);
    if (error) {
      alertUnreportedError(error, t("events.something-went-wrong"));
      return;
    }

    if (data?.image) {
      const image = data.image;
      onChange(prev => ({ ...prev, image }));
    }
    setImageKey(key => key + 1);
  }

  function refreshImage(image: string) {
    if (image) {
      onChange(prev => ({ ...prev, image }));
    }
    setImageKey(key => key + 1);
  }

  function deleteImage() {
    // The image is already deleted on the backend, just need to update the UI
    onChange(prev => ({ ...prev, image: "" }));
    setImageKey(key => key + 1);
  }

  const ownerItems = allUsers.map(itemsProps);

  return (
    <Box sx={{ display: "flex", justifyContent: "flex-start", alignItems: "flex-start", flexWrap: "wrap" }}>
      <Box sx={{ my: 1 }}>
        <RecipeImageUploadBtn
          slug={recipe.slug}
          onUpload={file => void uploadImage(file)}
          onRefresh={refreshImage}
          onDelete={deleteImage}
        />
      </Box>
      <Box sx={{ my: 1, mx: 0.5 }}>
        <RecipeSettingsMenu
          value={recipe.settings}
          onChange={settings => onChange(prev => ({ ...prev, settings: settings as RecipeModel["settings"] }))}
          isOwner={recipe.userId == user.id}
        />
      </Box>
      <Box sx={{ flexGrow: 1 }} />
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, my: 1, maxWidth: 300, width: "100%" }}>
        <UserAvatar userId={recipe.userId} tooltip={false} />
        <TextField
          select
          value={ownerItems.some(item => item.value === recipe.userId) ? recipe.userId : ""}
          onChange={event => onChange(prev => ({ ...prev, userId: event.target.value }))}
          label={t("general.owner")}
          disabled={!canEditOwner}
          variant="outlined"
          size="small"
          fullWidth
          slotProps={{
            select: {
              renderValue: selected => ownerItems.find(item => item.value === selected)?.title ?? "",
            },
          }}
        >
          {ownerItems.map(item => (
            <MenuItem key={item.value} value={item.value}>
              <ListItemText primary={item.title} secondary={item.subtitle || undefined} />
            </MenuItem>
          ))}
        </TextField>
      </Box>
    </Box>
  );
}
