import { useEffect, useState } from "react";
import Fab from "@mui/material/Fab";
import Fade from "@mui/material/Fade";
import { icons } from "~/lib/icons";
import { Icon } from "~/components/global/Icon";

const threshold = 400;

export function AppScrollToTop() {
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowButton(document.documentElement.scrollTop > threshold);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <Fade in={showButton}>
      <Fab
        color="primary"
        size="medium"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        sx={{ position: "fixed", bottom: 16, right: 16, zIndex: 999 }}
      >
        <Icon path={icons.arrowUp} />
      </Fab>
    </Fade>
  );
}

export default AppScrollToTop;
