import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import Popover from "@mui/material/Popover";
import Typography from "@mui/material/Typography";
import { icons } from "~/lib/icons";
import type { RecipeSettings } from "~/lib/api/types/recipe";
import { useI18n } from "~/hooks/use-global-i18n";
import { Icon } from "~/components/global/Icon";
import { RecipeSettingsSwitches } from "./RecipeSettingsSwitches";

export function RecipeSettingsMenu({ value, onChange, isOwner, className }: { value: RecipeSettings; onChange: (value: RecipeSettings) => void; isOwner?: boolean; className?: string }) {
  const i18n = useI18n();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return (
    <Box className={className} sx={{ textAlign: "center" }}>
      <Button color="accent" variant="contained" onClick={e => setAnchor(e.currentTarget)} startIcon={<Icon path={icons.cog} />}>
        {i18n.t("general.settings")}
      </Button>
      <Popover open={!!anchor} anchorEl={anchor} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: "bottom", horizontal: "left" }}>
        <Card>
          <Typography variant="h6" sx={{ px: 2, py: 1 }}>{i18n.t("recipe.recipe-settings")}</Typography>
          <Divider sx={{ mx: 1 }} />
          <CardContent sx={{ pt: 1, pb: 1 }}>
            <RecipeSettingsSwitches value={value} onChange={onChange} isOwner={isOwner} />
          </CardContent>
        </Card>
      </Popover>
    </Box>
  );
}

export default RecipeSettingsMenu;
