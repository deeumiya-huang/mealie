// Usage: <RecipePageFooter recipe={recipe} onChange={update} /> — the original URL (a link when viewing, a field when
// editing) and, for advanced users while editing, the API extras (key/value pairs). (Vue `v-model` → `recipe` +
// `onChange`.)
import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { AdvancedOnly } from "@/components/global/AdvancedOnly";
import { BaseButton } from "@/components/global/BaseButton";
import { MdiIcon } from "@/components/global/MdiIcon";
import { usePageState } from "@/hooks/recipe-page/shared-state";
import { useI18n } from "@/i18n";
import { icons } from "@/lib/icons";
import type { RecipeChange, RecipeModel } from "../recipe-model";

interface RecipePageFooterProps {
  recipe: RecipeModel;
  onChange: RecipeChange;
}

type Extras = Record<string, unknown>;

export function RecipePageFooter({ recipe, onChange }: RecipePageFooterProps) {
  const { t } = useI18n();
  const { isEditForm, isCookMode } = usePageState(recipe.slug);
  const [apiNewKey, setApiNewKey] = useState("");

  const extras = (recipe.extras ?? {}) as Extras;

  function setExtras(update: (extras: Extras) => Extras) {
    onChange(prev => ({ ...prev, extras: update((prev.extras ?? {}) as Extras) as RecipeModel["extras"] }));
  }

  function createApiExtra() {
    if (!recipe) {
      return;
    }
    // check for duplicate keys
    if (Object.keys(extras).includes(apiNewKey)) {
      return;
    }
    const key = apiNewKey;
    setExtras(current => ({ ...current, [key]: "" }));
    setApiNewKey("");
  }

  function removeApiExtra(key: string) {
    if (!recipe) {
      return;
    }
    setExtras((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  return (
    <div>
      <CardActions sx={{ justifyContent: "flex-end" }}>
        {isEditForm
          ? (
              <TextField
                value={recipe.orgURL ?? ""}
                onChange={event => onChange(prev => ({ ...prev, orgURL: event.target.value }))}
                sx={{ mt: 5 }}
                variant="standard"
                fullWidth
                label={t("recipe.original-url")}
              />
            )
          : recipe.orgURL && !isCookMode && (
            <Button
              disableRipple
              variant="contained"
              disableElevation
              href={recipe.orgURL}
              color="secondary"
              target="_blank"
              size="small"
              sx={{ "mr": -1, "bgcolor": "secondary.dark", "&:hover": { bgcolor: "secondary.dark" } }}
            >
              {t("recipe.original-url")}
            </Button>
          )}
      </CardActions>
      <AdvancedOnly>
        {isEditForm && (
          <Card elevation={0} sx={{ mb: 1, mx: -1 }}>
            <Typography variant="h5" component="div" sx={{ fontWeight: 500, opacity: 0.8, px: 2, pt: 2 }}>
              {t("recipe.api-extras")}
            </Typography>
            <Divider sx={{ ml: 2 }} />
            <CardContent>
              {t("recipe.api-extras-description")}
              {Object.keys(extras).map(key => (
                <Box key={key} sx={{ mt: 0.5, py: 1.5 }}>
                  <Box sx={{ maxWidth: 400 }}>
                    <TextField
                      value={String(extras[key] ?? "")}
                      onChange={(event) => {
                        const value = event.target.value;
                        setExtras(current => ({ ...current, [key]: value }));
                      }}
                      size="small"
                      variant="standard"
                      fullWidth
                      label={key}
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <IconButton
                                aria-label={t("general.delete")}
                                sx={{ "bgcolor": "error.main", "color": "error.contrastText", "&:hover": { bgcolor: "error.dark" } }}
                                onClick={() => removeApiExtra(key)}
                              >
                                <MdiIcon path={icons.delete} />
                              </IconButton>
                            </InputAdornment>
                          ),
                        },
                      }}
                    />
                  </Box>
                </Box>
              ))}
            </CardContent>
            <CardActions sx={{ display: "flex", ml: 1, mt: -1.5 }}>
              <div>
                <TextField
                  value={apiNewKey}
                  onChange={event => setApiNewKey(event.target.value)}
                  sx={{ minWidth: "200px" }}
                  label={t("recipe.message-key")}
                  variant="standard"
                />
              </div>
              <Box sx={{ ml: 2.5 }}>
                <BaseButton create small onClick={createApiExtra} />
              </Box>
            </CardActions>
          </Card>
        )}
      </AdvancedOnly>
    </div>
  );
}
