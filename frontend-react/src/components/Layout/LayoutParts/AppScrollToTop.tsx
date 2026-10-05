// Usage: <AppScrollToTop /> — a floating button that appears after scrolling 400 px and scrolls back up.
import { useEffect, useState } from "react";
import Fab from "@mui/material/Fab";
import Fade from "@mui/material/Fade";
import { MdiIcon } from "@/components/global/MdiIcon";
import { icons } from "@/lib/icons";

const threshold = 400;

export function AppScrollToTop() {
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    function onScroll() {
      setShowButton(document.documentElement.scrollTop > threshold);
    }
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <Fade in={showButton} unmountOnExit>
      <Fab
        color="primary"
        size="medium"
        onClick={scrollToTop}
        sx={{ position: "fixed", bottom: 0, right: 0, m: 2, zIndex: 999 }}
      >
        <MdiIcon path={icons.arrowUp} />
      </Fab>
    </Fade>
  );
}
