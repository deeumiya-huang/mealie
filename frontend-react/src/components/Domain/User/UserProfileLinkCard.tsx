import type { ReactNode } from "react";
import { Link as RouterLink } from "react-router";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardActions from "@mui/material/CardActions";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import { useDisplay } from "~/hooks/use-display";

export interface UserProfileLinkCardProps {
  link: { text: string; to: string };
  image?: string;
  title: ReactNode;
  children?: ReactNode;
}

/** A card on the profile page linking to one settings page, with its illustration. */
export function UserProfileLinkCard({ link, image = "", title, children }: UserProfileLinkCardProps) {
  const { smAndDown, mdAndUp } = useDisplay();
  const img = <Box component="img" src={image} alt="" sx={{ width: 150, height: 125, objectFit: "contain" }} />;
  return (
    <Card variant="outlined" sx={{ height: "100%", mt: 2, display: "flex", flexDirection: "column", borderColor: "lightgrey" }}>
      <CardActionArea component={RouterLink} to={link.to} sx={{ flexGrow: 1, p: 1, display: "flex", flexDirection: "column", alignItems: "stretch", justifyContent: "flex-start" }}>
        {smAndDown && <Box sx={{ p: 1, mx: "auto" }}>{img}</Box>}
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <Typography variant="subtitle1" sx={{ px: 2, pt: 1 }}>{title}</Typography>
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography variant="body2" color="text.secondary">{children}</Typography>
            </Box>
          </div>
          {mdAndUp && <Box sx={{ py: 1, px: 5, my: "auto" }}>{img}</Box>}
        </Box>
      </CardActionArea>
      <Divider />
      <CardActions>
        <Button variant="text" color="info" component={RouterLink} to={link.to}>
          {link.text}
        </Button>
      </CardActions>
    </Card>
  );
}

export default UserProfileLinkCard;
