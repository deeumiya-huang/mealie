import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { AnimatedChildren, type AnimationSpec } from "./AnimatedChildren";

const FADE: AnimationSpec = { name: "fade", enterFrom: "opacity: 0;", leaveTo: "opacity: 0;" };

describe("AnimatedChildren", () => {
  afterEach(cleanup);

  test("keeps a removed child in place with the leave class", () => {
    const { rerender } = render(
      <AnimatedChildren animation={FADE}>
        <div key="a">first</div>
        <div key="b">second</div>
      </AnimatedChildren>,
    );
    rerender(
      <AnimatedChildren animation={FADE}>
        <div key="b">second</div>
      </AnimatedChildren>,
    );

    expect(screen.getByText("first").className).toContain("fade-leave-active");
    expect(screen.getByText("second").className).toContain("fade-enter-active");
  });

  test("a removed child leaves with the props of its last render", () => {
    const { rerender } = render(
      <AnimatedChildren animation={FADE}>
        <div key="a">unchecked</div>
      </AnimatedChildren>,
    );
    // same keys, new content (e.g. a server refresh replaced the item)
    rerender(
      <AnimatedChildren animation={FADE}>
        <div key="a">checked</div>
      </AnimatedChildren>,
    );
    rerender(<AnimatedChildren animation={FADE}>{[]}</AnimatedChildren>);

    expect(screen.getByText("checked").className).toContain("fade-leave-active");
    expect(screen.queryByText("unchecked")).toBeNull();
  });
});
