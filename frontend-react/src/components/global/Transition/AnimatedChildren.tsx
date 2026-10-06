// Shared engine of SpinTransition and SwipeTransition (Vue `<TransitionGroup appear>` / `<Transition mode="out-in" appear>`).
// Children must be keyed elements that accept `className` and `onAnimationEnd` (DOM elements or components that
// forward them). A child plays the enter animation when it mounts (also on first render, like `appear`); a child that
// is removed is kept in place and plays the leave animation first. In "out-in" mode the new child only mounts once the
// old one has left. Items moving inside a group are not animated (Vue's `-move` class), see the report.
import { Children, cloneElement, isValidElement, useEffect, useState, type Key, type ReactElement, type ReactNode } from "react";
import GlobalStyles from "@mui/material/GlobalStyles";

export interface AnimationSpec {
  /** Class prefix, e.g. "spin" or "swipe-left". */
  name: string;
  /** CSS declarations of the state the child animates from when entering. */
  enterFrom: string;
  /** CSS declarations of the state the child animates to when leaving. */
  leaveTo: string;
}

const TIMING = "0.3s cubic-bezier(0.5, -0.23, 0.5, 1.25)";

function animationStyles({ name, enterFrom, leaveTo }: AnimationSpec) {
  return `
@keyframes ${name}-enter { from { ${enterFrom} } }
@keyframes ${name}-leave { to { ${leaveTo} } }
.${name}-enter-active { animation: ${name}-enter ${TIMING}; }
.${name}-leave-active { animation: ${name}-leave ${TIMING} forwards; pointer-events: none; }
*:has(> .overflow-x-hidden-child) { overflow-x: hidden; }
`;
}

interface Departed {
  key: Key;
  element: ReactElement<ChildProps>;
  index: number;
}

interface ChildProps {
  className?: string;
  onAnimationEnd?: (event: React.AnimationEvent<HTMLElement>) => void;
}

interface Snapshot {
  children: ReactNode;
  keys: Key[];
  elements: Map<Key, ReactElement<ChildProps>>;
}

function sameKeys(a: Key[], b: Key[]) {
  return a.length === b.length && a.every((key, index) => key === b[index]);
}

interface AnimatedChildrenProps {
  animation: AnimationSpec;
  mode?: "group" | "out-in";
  hideOverflow?: boolean;
  children?: ReactNode;
}

export function AnimatedChildren({ animation, mode = "group", hideOverflow = false, children }: AnimatedChildrenProps) {
  const current = Children.toArray(children).filter((child): child is ReactElement<ChildProps> => isValidElement(child));
  const keys = current.map(child => child.key as Key);

  const [snapshot, setSnapshot] = useState<Snapshot>(() => ({ children, keys, elements: new Map(current.map(child => [child.key as Key, child])) }));
  const [departed, setDeparted] = useState<Departed[]>([]);

  // Derived while rendering: elements that vanished from `children` are kept as `departed` until their leave animation ends.
  // The snapshot follows every new `children`, so a departing child leaves with the props of its last render (not those it
  // had when the key set last changed).
  if (children !== snapshot.children) {
    if (!sameKeys(keys, snapshot.keys)) {
      const removed = snapshot.keys.filter(key => !keys.includes(key));
      setDeparted(previous => [
        ...previous.filter(entry => !keys.includes(entry.key)),
        ...removed
          .filter(key => !previous.some(entry => entry.key === key))
          .map(key => ({ key, element: snapshot.elements.get(key) as ReactElement<ChildProps>, index: snapshot.keys.indexOf(key) })),
      ]);
    }
    setSnapshot({ children, keys, elements: new Map(current.map(child => [child.key as Key, child])) });
  }

  // Fallback for environments where `animationend` never fires (reduced motion, hidden elements, jsdom).
  useEffect(() => {
    if (departed.length === 0) return;
    const timer = setTimeout(() => setDeparted(previous => previous.filter(item => !departed.includes(item))), 400);
    return () => clearTimeout(timer);
  }, [departed]);

  const classFor = (child: ReactElement<ChildProps>, state: "enter" | "leave") =>
    [child.props.className, `${animation.name}-${state}-active`, hideOverflow ? "overflow-x-hidden-child" : ""].filter(Boolean).join(" ");

  const leaving = departed.map(entry => cloneElement(entry.element, {
    key: entry.key,
    className: classFor(entry.element, "leave"),
    onAnimationEnd: (event: React.AnimationEvent<HTMLElement>) => {
      entry.element.props.onAnimationEnd?.(event);
      if (event.target === event.currentTarget) {
        setDeparted(previous => previous.filter(item => item.key !== entry.key));
      }
    },
  }));

  const entering = current.map(child => cloneElement(child, { className: classFor(child, "enter") }));

  let rendered: ReactElement<ChildProps>[];
  if (mode === "out-in") {
    rendered = departed.length > 0 ? leaving : entering;
  }
  else {
    rendered = [...entering];
    departed.forEach((entry, order) => {
      rendered.splice(Math.min(entry.index, rendered.length), 0, leaving[order]);
    });
  }

  return (
    <>
      <GlobalStyles styles={animationStyles(animation)} />
      {rendered}
    </>
  );
}
