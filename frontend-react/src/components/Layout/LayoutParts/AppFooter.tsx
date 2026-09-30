import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import { icons } from "~/lib/icons";
import { Icon } from "~/components/global/Icon";

export function AppFooter() {
  return (
    <Box component="footer" sx={{ bgcolor: "primary.main", color: "#fff", py: 1, textAlign: "center" }}>
      <IconButton href="https://github.com/mealie-recipes/mealie" target="_blank" sx={{ color: "#fff" }}>
        <Icon path={icons.github} />
      </IconButton>
      {new Date().getFullYear()} — <strong> Mealie </strong>
    </Box>
  );
}

export default AppFooter;
