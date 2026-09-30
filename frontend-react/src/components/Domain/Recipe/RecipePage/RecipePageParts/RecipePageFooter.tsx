import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { icons } from "~/lib/icons";
import type { NoUndefinedField } from "~/lib/api/types/non-generated";
import type { Recipe } from "~/lib/api/types/recipe";
import { usePageState } from "~/hooks/recipe-page/shared-state";
import { useI18n } from "~/hooks/use-global-i18n";
import { AdvancedOnly } from "~/components/global/AdvancedOnly";
import { BaseButton } from "~/components/global/BaseButton";
import { Icon } from "~/components/global/Icon";
import { TextInput } from "~/components/global/form";

type R = NoUndefinedField<Recipe>;

export function RecipePageFooter({ value: recipe, onChange }: { value: R; onChange: (recipe: R | ((prev: R) => R)) => void }) {
  const i18n = useI18n();
  const { isEditForm, isCookMode } = usePageState(recipe.slug);
  const [apiNewKey, setApiNewKey] = useState("");
  const extras = (recipe.extras ?? {}) as Record<string, string>;

  function createApiExtra() {
    // check for duplicate keys
    if (Object.keys(extras).includes(apiNewKey)) return;
    onChange(prev => ({ ...prev, extras: { ...(prev.extras ?? {}), [apiNewKey]: "" } }));
    setApiNewKey("");
  }

  function removeApiExtra(key: string) {
    onChange((prev) => {
      const next = { ...((prev.extras ?? {}) as Record<string, string>) };
      delete next[key];
      return { ...prev, extras: next };
    });
  }

  return (
    <div>
      <CardActions sx={{ justifyContent: "flex-end" }}>
        {isEditForm
          ? <TextInput value={recipe.orgURL} onChange={orgURL => onChange(prev => ({ ...prev, orgURL }))} sx={{ mt: 5 }} variant="underlined" label={i18n.t("recipe.original-url")} />
          : recipe.orgURL && !isCookMode && (
            <Button variant="contained" disableElevation href={recipe.orgURL} target="_blank" size="small" sx={{ mr: -1, bgcolor: "secondary.dark" }}>
              {i18n.t("recipe.original-url")}
            </Button>
          )}
      </CardActions>
      <AdvancedOnly>
        {isEditForm && (
          <Card elevation={0} sx={{ mb: 1, mx: -1 }}>
            <Typography variant="h5" sx={{ px: 2, py: 1.5, fontWeight: 500, opacity: 0.8 }}>{i18n.t("recipe.api-extras")}</Typography>
            <Divider sx={{ ml: 2 }} />
            <CardContent>
              {i18n.t("recipe.api-extras-description")}
              {Object.keys(extras).map(key => (
                <Box key={key} sx={{ mt: 0.5, maxWidth: 400, display: "flex", alignItems: "center", gap: 1 }}>
                  <IconButton color="error" onClick={() => removeApiExtra(key)}><Icon path={icons.delete} /></IconButton>
                  <TextInput value={extras[key]} onChange={v => onChange(prev => ({ ...prev, extras: { ...(prev.extras ?? {}), [key]: v } }))} variant="underlined" label={key} />
                </Box>
              ))}
            </CardContent>
            <CardActions sx={{ display: "flex", ml: 1, mt: -1.5 }}>
              <Box sx={{ minWidth: 200 }}>
                <TextInput value={apiNewKey} onChange={setApiNewKey} label={i18n.t("recipe.message-key")} variant="underlined" />
              </Box>
              <BaseButton create small sx={{ ml: 2.5 }} onClick={createApiExtra} />
            </CardActions>
          </Card>
        )}
      </AdvancedOnly>
    </div>
  );
}

export default RecipePageFooter;
