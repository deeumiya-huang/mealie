import { screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { GroupAIProviderDialog } from "./GroupAIProviderDialog";
import type { AIProviderOut } from "@/lib/api/types/group";
import { renderWithProviders } from "@/test/utils";

const mocks = vi.hoisted(() => ({
  getOne: vi.fn(),
}));

vi.mock("@/hooks/use-ai-providers", () => ({
  useAIProviders: () => ({
    loading: false,
    getOne: mocks.getOne,
    testOne: vi.fn(),
    testSavedOne: vi.fn(),
  }),
}));

function provider(overrides: Partial<AIProviderOut>): AIProviderOut {
  return {
    id: "id",
    name: "name",
    model: "model",
    baseUrl: null,
    timeout: 300,
    requestHeaders: {},
    requestParams: {},
    ...overrides,
  } as AIProviderOut;
}

function mountDialog(providerId?: string) {
  const view = renderWithProviders(<GroupAIProviderDialog open providerId={providerId} />);
  return {
    ...view,
    setProps: (props: { providerId?: string }) =>
      view.rerender(<GroupAIProviderDialog open providerId={props.providerId} />),
  };
}

describe("groupAIProviderDialog", () => {
  beforeEach(() => {
    mocks.getOne.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("a stale fetch for a previously-selected provider does not clobber the form after switching providers", async () => {
    let resolveA: (value: unknown) => void;
    let resolveB: (value: unknown) => void;
    const pendingA = new Promise((resolve) => { resolveA = resolve; });
    const pendingB = new Promise((resolve) => { resolveB = resolve; });

    mocks.getOne.mockImplementation((id: string) => {
      if (id === "provider-a") return pendingA;
      if (id === "provider-b") return pendingB;
      throw new Error(`unexpected provider id: ${id}`);
    });

    const wrapper = mountDialog("provider-a");

    // Switch to provider B before A's fetch has resolved (e.g. the user closed A's
    // edit dialog and opened B's before the network responded).
    wrapper.setProps({ providerId: "provider-b" });

    // B's fetch resolves first...
    resolveB!({ data: provider({ id: "provider-b", name: "Provider B", model: "model-b" }) });

    const nameInput = () => screen.getAllByRole("textbox")[0] as HTMLInputElement;
    await waitFor(() => expect(nameInput().value).toBe("Provider B"));

    // ...and A's now-stale fetch resolves afterward. It must be ignored rather than
    // overwriting the form with provider A's data while provider B is being edited.
    resolveA!({ data: provider({ id: "provider-a", name: "Provider A", model: "model-a" }) });
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(nameInput().value).toBe("Provider B");
  });
});
