import { renderHook } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { usePasswordStrength } from "../use-passwords";
import { stubI18n } from "@/test/utils";

describe("test usePasswordStrength", () => {
  test("weak password", () => {
    const pw = "123456";

    const { result } = renderHook(() => usePasswordStrength(pw, stubI18n()));
    const { score, strength, color } = result.current;

    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(40);
    expect(strength).toBe("Weak");
    expect(color).toBe("error");
  });

  test("very strong password", () => {
    const password = "My~Secret~Not~So~Secret?123";
    const { result } = renderHook(() => usePasswordStrength(password, stubI18n()));
    const { score, strength, color } = result.current;
    expect(score).toBeGreaterThan(90);
    expect(score).toBe(100);
    expect(strength).toBe("Very Strong");
    expect(color).toBe("success");
  });
});
