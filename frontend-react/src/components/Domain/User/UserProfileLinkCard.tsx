// Usage: <UserProfileLinkCard link={{ text: t("profile.manage-user-profile"), to: "/user/profile/edit" }}
//          image="/svgs/manage-profile.svg" title={t("profile.user-settings")}>{t("profile.user-settings-description")}
//        </UserProfileLinkCard>
// An outlined card that links to `link.to`: title (Vue `#title` slot), description (default slot), an
// illustration (beside the text on wide screens, above it on narrow ones) and a text button with `link.text`.
import type { MouseEvent, ReactNode } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import { Link, useNavigate } from "react-router";
import { BaseImg } from "@/components/global/BaseImg";
import { useDisplay } from "@/hooks/utils";

interface LinkProp {
  text: string;
  url?: string;
  to: string;
}

interface UserProfileLinkCardProps {
  link: LinkProp;
  image?: string;
  title?: ReactNode;
  children?: ReactNode;
}

export function UserProfileLinkCard({ link, image = "", title, children }: UserProfileLinkCardProps) {
  const { smAndDown, mdAndUp } = useDisplay();
  const navigate = useNavigate();

  // The whole card is a link in Vuetify (`<v-card :to>`); the real link is the button below, so a
  // click anywhere else on the card follows it without nesting one anchor in another.
  function onCardClick(event: MouseEvent<HTMLElement>) {
    if (event.defaultPrevented || (event.target as HTMLElement).closest("a")) {
      return;
    }
    void navigate(link.to);
  }

  return (
    <Card
      variant="outlined"
      onClick={onCardClick}
      sx={{
        borderColor: "lightgrey",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        mt: 2,
        p: 1,
        cursor: "pointer",
      }}
    >
      {smAndDown && (
        <Box sx={{ p: 1, mx: "auto" }}>
          <BaseImg width="150px" height={125} src={image} />
        </Box>
      )}
      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
        <Box>
          <Typography variant="subtitle1" component="div" sx={{ px: 2, pt: 2, pb: 0 }}>
            {title}
          </Typography>
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
            <CardContent sx={{ display: "flex", flexDirection: "row", mb: "auto", color: "text.secondary" }}>
              {children}
            </CardContent>
          </Box>
        </Box>
        {mdAndUp && (
          <Box sx={{ py: 1, px: 5, my: "auto" }}>
            <BaseImg width="150px" height={125} src={image} />
          </Box>
        )}
      </Box>
      <Box sx={{ flexGrow: 1 }} />
      <Divider />
      <CardActions>
        <Button variant="text" color="info" component={Link} to={link.to}>
          {link.text}
        </Button>
      </CardActions>
    </Card>
  );
}
