import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import { keyframes } from "@mui/material/styles";

const fromRight = keyframes`
  from { opacity: 0; transform: translateX(30px); }
  to { opacity: 1; transform: none; }
`;
const fromLeft = keyframes`
  from { opacity: 0; transform: translateX(-30px); }
  to { opacity: 1; transform: none; }
`;

/**
 * Children swipe in from the side (Vue <Transition name="swipe-left|right" appear>). Give changing
 * content a new `key` to replay the animation.
 */
export function SwipeTransition({ direction, children }: { direction: "left" | "right"; group?: boolean; children: ReactNode }) {
  const animation = direction === "left" ? fromRight : fromLeft;
  return (
    <Box sx={{ "overflowX": "hidden", "& > *": { animation: `${animation} 0.3s cubic-bezier(0.5, -0.23, 0.5, 1.25)` } }}>
      {children}
    </Box>
  );
}

export default SwipeTransition;
