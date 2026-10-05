// Usage: <SpinTransition><div key={id}>…</div></SpinTransition> — children scale/rotate in on mount and out on removal.
import type { ReactNode } from "react";
import { AnimatedChildren, type AnimationSpec } from "./AnimatedChildren";

const SPIN: AnimationSpec = {
  name: "spin",
  enterFrom: "opacity: 0; transform: scale(0.01) rotate(10deg); transform-origin: center;",
  leaveTo: "opacity: 0; transform: scale(0.01) rotate(10deg); transform-origin: center;",
};

export function SpinTransition({ children }: { children?: ReactNode }) {
  return <AnimatedChildren animation={SPIN}>{children}</AnimatedChildren>;
}
