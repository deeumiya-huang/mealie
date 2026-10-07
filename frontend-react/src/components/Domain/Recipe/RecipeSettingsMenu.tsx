// Usage: <RecipeSettingsMenu value={recipe.settings} onChange={s => …} isOwner={isOwner} /> — the "Settings" button of
// the recipe editor, opening the recipe's setting switches. (Vue `v-model` → `value` + `onChange`.)
import { useState, type MouseEvent } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import Popover from "@mui/material/Popover";
import Typography from "@mui/material/Typography";
import { MdiIcon } from "@/components/global/MdiIcon";
import { RecipeSettingsSwitches } from "@/components/Domain/Recipe/RecipeSettingsSwitches";
import { useI18n } from "@/i18n";
import type { RecipeSettings } from "@/lib/api/types/recipe";
import { icons } from "@/lib/icons";

interface RecipeSettingsMenuProps {
  value: RecipeSettings;
  onChange: (value: RecipeSettings) => void;
  isOwner?: boolean;
  className?: string;
}

export function RecipeSettingsMenu({ value, onChange, isOwner, className }: RecipeSettingsMenuProps) {
  const { t } = useI18n();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  return (
    <Box className={className} sx={{ textAlign: "center" }}>
      <Button
        color="accent"
        variant="contained"
        aria-haspopup="true"
        aria-expanded={!!anchor}
        startIcon={<MdiIcon path={icons.cog} />}
        onClick={(event: MouseEvent<HTMLElement>) => setAnchor(event.currentTarget)}
      >
        {t("general.settings")}
      </Button>
      <Popover
        open={!!anchor}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
      >
        <Card>
          <Typography variant="h6" component="div" sx={{ py: 1, px: 2 }}>
            {t("recipe.recipe-settings")}
          </Typography>
          <Divider sx={{ mx: 1 }} />
          <CardContent sx={{ pt: 1, pb: 1 }}>
            <RecipeSettingsSwitches
              value={value}
              onChange={onChange}
              isOwner={isOwner}
            />
          </CardContent>
        </Card>
      </Popover>
    </Box>
  );
}
