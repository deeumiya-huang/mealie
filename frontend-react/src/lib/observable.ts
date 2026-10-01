/**
 * Minimal observable values for controller-style page logic (the shopping list page).
 *
 * The Vue composables this replaces share `ref`s between several sub-composables and mutate the
 * objects inside them in place. Rather than rewrite that logic immutably, the controllers keep
 * the same shape: a `Ref` is a `{ value }` box, and every assignment (plus every controller
 * action, see `withNotify`) pings a change channel. The React side re-renders on those pings via
 * `useObservedController`, so components read the current values straight off the controller.
 */
import { useEffect, useReducer, useRef, useState } from "react";

export interface Ref<T> {
  value: T;
}

export interface ReadonlyRef<T> {
  readonly value: T;
}

type Listener = () => void;

const REF_MARK = Symbol("observable-ref");

/** Tags `box` as a ref, so `isRef` (and test helpers that unwrap refs) can tell it apart. */
export function markRef<T extends object>(box: T): T {
  Object.defineProperty(box, REF_MARK, { value: true });
  return box;
}

export function isRef(value: unknown): value is Ref<unknown> {
  return typeof value === "object" && value !== null && REF_MARK in value;
}

export class ChangeChannel {
  private listeners = new Set<Listener>();
  private scheduled = false;

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Batches synchronous changes into one notification (a microtask later). */
  notify() {
    if (this.scheduled) return;
    this.scheduled = true;
    queueMicrotask(() => {
      this.scheduled = false;
      this.listeners.forEach(listener => listener());
    });
  }
}

/** Channel used when a ref is created without one. */
export const defaultChannel = new ChangeChannel();

export function ref<T>(initial: T, channel: ChangeChannel = defaultChannel): Ref<T> {
  let current = initial;
  return markRef({
    get value() {
      return current;
    },
    set value(next: T) {
      current = next;
      channel.notify();
    },
  });
}

/** A derived value, recomputed on every read (the inputs are small). */
export function computed<T>(getter: () => T): ReadonlyRef<T> {
  return markRef({
    get value() {
      return getter();
    },
  });
}

/** Plain object whose property writes notify (Vue `reactive`, shallow). */
export function reactive<T extends object>(target: T, channel: ChangeChannel = defaultChannel): T {
  return new Proxy(target, {
    set(obj, key, value) {
      Reflect.set(obj, key, value);
      channel.notify();
      return true;
    },
  });
}

/**
 * Wraps every function on `obj` so that calling it (and settling the promise it returns) notifies
 * the channel. Covers in-place mutations of nested objects, which no setter sees.
 *
 * `pure` names read-only functions that components call while rendering: they must stay
 * unwrapped, or every render would schedule another one.
 */
export function withNotify<T extends object>(obj: T, channel: ChangeChannel = defaultChannel, pure: readonly (keyof T)[] = []): T {
  const wrapped = { ...obj } as Record<string, unknown>;
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val !== "function" || pure.includes(key as keyof T)) continue;
    wrapped[key] = (...args: unknown[]) => {
      const result = (val as (...a: unknown[]) => unknown)(...args);
      channel.notify();
      if (result instanceof Promise) {
        void result.finally(() => channel.notify());
      }
      return result;
    };
  }
  return wrapped as T;
}

/** Re-renders the calling component whenever `channel` is notified. */
export function useChannel(channel: ChangeChannel = defaultChannel) {
  const [, force] = useReducer((n: number) => n + 1, 0);
  useEffect(() => channel.subscribe(force), [channel]);
}

/**
 * A `v-model` as a ref for controller code: reads the latest value (including writes made since
 * the last render, so async code that writes twice builds on its own first write) and forwards
 * every write, with the value it replaces, to `onChange`.
 */
export function useModelRef<T>(value: T, onChange: (value: T, prev: T) => void): Ref<T> {
  const latest = useRef(value);
  const handler = useRef(onChange);
  useEffect(() => {
    latest.current = value;
    handler.current = onChange;
  });
  const [box] = useState(() => markRef({
    get value() {
      return latest.current;
    },
    set value(next: T) {
      const prev = latest.current;
      latest.current = next;
      handler.current(next, prev);
    },
  }));
  return box;
}
