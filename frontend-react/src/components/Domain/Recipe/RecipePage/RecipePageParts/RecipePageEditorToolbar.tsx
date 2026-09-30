import Box from "@mui/material/Box";
import type { NoUndefinedField } from "~/lib/api/types/non-generated";
import type { Recipe } from "~/lib/api/types/recipe";
import type { UserSummary } from "~/lib/api/types/user";
import { useUserApi } from "~/hooks/api";
import { usePageState, usePageUser } from "~/hooks/recipe-page/shared-state";
import { useHouseholdStore } from "~/hooks/store";
import { useUserStore } from "~/hooks/store/use-user-store";
import { useI18n } from "~/hooks/use-global-i18n";
import { alertUnreportedError } from "~/hooks/use-toast";
import { SelectInput } from "~/components/global/form";
import { UserAvatar } from "~/components/Domain/User/UserAvatar";
import { RecipeImageUploadBtn } from "../../RecipeImageUploadBtn";
import { RecipeSettingsMenu } from "../../RecipeSettingsMenu";

type R = NoUndefinedField<Recipe>;

export function RecipePageEditorToolbar({ value: recipe, onChange }: { value: R; onChange: (recipe: R | ((prev: R) => R)) => void }) {
  const i18n = useI18n();
  const api = useUserApi();
  const { user } = usePageUser();
  const { setImageKey } = usePageState(recipe.slug);
  const { store: allUsers } = useUserStore();
  const { store: households } = useHouseholdStore();
  const canEditOwner = user.id === recipe.userId || user.admin;

  async function uploadImage(fileObject: File) {
    if (!recipe || !recipe.slug) return;
    const { data, error } = await api.recipes.updateImage(recipe.slug, fileObject);
    if (error) {
      alertUnreportedError(error as never, i18n.t("events.something-went-wrong"));
      return;
    }
    if (data?.image) onChange(prev => ({ ...prev, image: data.image }));
    setImageKey(k => k + 1);
  }

  return (
    <Box sx={{ display: "flex", justifyContent: "flex-start", alignItems: "flex-start", flexWrap: "wrap" }}>
      <RecipeImageUploadBtn
        className="my-2"
        slug={recipe.slug}
        onUpload={f => void uploadImage(f)}
        onRefresh={(image) => {
          if (image) onChange(prev => ({ ...prev, image }));
          setImageKey(k => k + 1);
        }}
        onDelete={() => {
          // The image is already deleted on the backend, just need to update the UI
          onChange(prev => ({ ...prev, image: "" }));
          setImageKey(k => k + 1);
        }}
      />
      <Box sx={{ my: 1, mx: 0.5 }}>
        <RecipeSettingsMenu value={recipe.settings} onChange={settings => onChange(prev => ({ ...prev, settings: settings as R["settings"] }))} isOwner={recipe.userId === user.id} />
      </Box>
      <Box sx={{ flex: 1 }} />
      <Box sx={{ my: 1, maxWidth: 300, width: 300, display: "flex", alignItems: "center", gap: 1 }}>
        <UserAvatar userId={recipe.userId} tooltip={false} />
        <SelectInput<UserSummary, string>
          value={recipe.userId}
          onChange={userId => onChange(prev => ({ ...prev, userId }))}
          items={allUsers}
          itemTitle="fullName"
          itemValue="id"
          label={i18n.t("general.owner")}
          disabled={!canEditOwner}
          hideDetails
          renderItem={(item) => {
            const owner = allUsers.find(u => u.id === item.id);
            const household = owner ? households.find(h => h.id === owner.householdId)?.name || "" : "";
            return (
              <Box>
                <div>{item.fullName}</div>
                {household && <Box sx={{ typography: "caption", color: "text.secondary" }}>{household}</Box>}
              </Box>
            );
          }}
        />
      </Box>
    </Box>
  );
}

export default RecipePageEditorToolbar;
