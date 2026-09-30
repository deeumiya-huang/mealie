import { useState } from "react";
import type { ElementType, ReactNode } from "react";

interface ToggleSlotProps {
  toggle: () => void;
  value: boolean;
}

export interface ToggleStateProps {
  value?: boolean;
  onChange?: (value: boolean) => void;
  tag?: ElementType;
  activator?: (props: ToggleSlotProps) => ReactNode;
  children?: (props: ToggleSlotProps) => ReactNode;
}

/** Holds a boolean and hands `toggle` to render props (controlled when `value` is passed). */
export function ToggleState({ value, onChange, tag: Tag = "div", activator, children }: ToggleStateProps) {
  const [inner, setInner] = useState(false);
  const current = value ?? inner;
  const toggle = () => {
    setInner(!current);
    onChange?.(!current);
  };
  return (
    <Tag>
      {activator?.({ toggle, value: current })}
      {children?.({ toggle, value: current })}
    </Tag>
  );
}

export default ToggleState;
