import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import { keyframes } from "@mui/material/styles";

const spinIn = keyframes`
  from { opacity: 0; transform: scale(0.01) rotate(10deg); }
  to { opacity: 1; transform: none; }
`;

/** Children animate in with a spin/scale (Vue <TransitionGroup name="spin" appear>). */
export function SpinTransition({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ "display": "contents", "& > *": { animation: `${spinIn} 0.3s cubic-bezier(0.5, -0.23, 0.5, 1.25)`, transformOrigin: "center" } }}>
      {children}
    </Box>
  );
}

export default SpinTransition;
