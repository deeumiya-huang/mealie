// Usage: <SwipeTransition direction="left"><div key={step}>…</div></SwipeTransition>
//        <SwipeTransition direction="right" group>{list}</SwipeTransition>
// Children slide 30px and fade in/out. Without `group` it is a single child that is swapped out-in (the old one leaves
// before the new one enters), with `group` every child animates independently.
import type { ReactNode } from "react";
import { AnimatedChildren, type AnimationSpec } from "./AnimatedChildren";

interface SwipeTransitionProps {
  direction: "left" | "right";
  group?: boolean;
  children?: ReactNode;
}

const SWIPE: Record<SwipeTransitionProps["direction"], AnimationSpec> = {
  left: {
    name: "swipe-left",
    enterFrom: "opacity: 0; transform: translateX(30px);",
    leaveTo: "opacity: 0; transform: translateX(-30px);",
  },
  right: {
    name: "swipe-right",
    enterFrom: "opacity: 0; transform: translateX(-30px);",
    leaveTo: "opacity: 0; transform: translateX(30px);",
  },
};

export function SwipeTransition({ direction, group = false, children }: SwipeTransitionProps) {
  return (
    <AnimatedChildren animation={SWIPE[direction]} mode={group ? "group" : "out-in"} hideOverflow>
      {children}
    </AnimatedChildren>
  );
}
