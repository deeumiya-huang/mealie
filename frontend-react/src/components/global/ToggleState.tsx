// Usage: <ToggleState renderActivator={({ toggle, value }) => <button onClick={toggle} />}>
//          {({ value, toggle }) => value && <div>…</div>}</ToggleState>
// Holds a boolean (Vue `v-model` → `value` + `onChange`; uncontrolled when `value` is omitted) and hands it to the
// `renderActivator` (Vue `#activator` slot) and `children` (default slot, node or render function).
import { createElement, useState, type ReactNode } from "react";

interface ToggleSlot {
  value: boolean;
  toggle: () => void;
}

interface ToggleStateProps {
  value?: boolean;
  onChange?: (value: boolean) => void;
  tag?: string;
  renderActivator?: (slot: ToggleSlot) => ReactNode;
  children?: ReactNode | ((slot: ToggleSlot) => ReactNode);
}

export function ToggleState({ value, onChange, tag = "div", renderActivator, children }: ToggleStateProps) {
  const [internal, setInternal] = useState(false);
  const current = value ?? internal;

  const toggle = () => {
    const next = !current;
    setInternal(next);
    onChange?.(next);
  };

  const slot: ToggleSlot = { value: current, toggle };

  return createElement(tag, null, renderActivator?.(slot), typeof children === "function" ? children(slot) : children);
}
