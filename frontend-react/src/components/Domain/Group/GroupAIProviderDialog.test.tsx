import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, cleanup } from "@testing-library/react";
import { GroupAIProviderDialog } from "./GroupAIProviderDialog";
import type { AIProviderOut } from "~/lib/api/types/group";
import { renderWithProviders } from "~/tests/utils";

const mocks = vi.hoisted(() => ({
  getOne: vi.fn(),
}));

vi.mock("~/hooks/use-ai-providers", () => ({
  useAIProviders: () => ({
    loading: false,
    getOne: mocks.getOne,
    testOne: vi.fn(),
    testSavedOne: vi.fn(),
  }),
}));

// Same stubs as the Vue test
vi.mock("~/components/global/BaseDialog", () => ({
  BaseDialog: ({ children, customCardAction }: { children?: ReactNode; customCardAction?: ReactNode }) => <div>{children}{customCardAction}</div>,
}));
vi.mock("~/components/global/AppLoader", () => ({ AppLoader: () => <div /> }));
vi.mock("~/components/global/BaseKeyValueEditor", () => ({ BaseKeyValueEditor: () => <div /> }));
vi.mock("~/components/global/form", () => ({
  VForm: ({ children }: { children?: ReactNode }) => <form>{children}</form>,
  TextInput: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <input value={value} onChange={e => onChange(e.target.value)} />
  ),
  NumberInput: () => <div />,
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
  const view = renderWithProviders(<GroupAIProviderDialog open onOpenChange={() => {}} providerId={providerId} />);
  return {
    ...view,
    setProviderId: (id: string) => view.rerender(<GroupAIProviderDialog open onOpenChange={() => {}} providerId={id} />),
  };
}

/** Lets pending promise callbacks and the resulting renders run (`flushPromises`). */
async function flushPromises() {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  });
}

describe("groupAIProviderDialog", () => {
  beforeEach(() => {
    mocks.getOne.mockReset();
  });

  afterEach(() => {
    cleanup();
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
    await flushPromises();

    // Switch to provider B before A's fetch has resolved (e.g. the user closed A's
    // edit dialog and opened B's before the network responded).
    wrapper.setProviderId("provider-b");
    await flushPromises();

    // B's fetch resolves first...
    resolveB!({ data: provider({ id: "provider-b", name: "Provider B", model: "model-b" }) });
    await flushPromises();

    const nameInput = () => wrapper.container.querySelectorAll("input")[0]!;
    expect(nameInput().value).toBe("Provider B");

    // ...and A's now-stale fetch resolves afterward. It must be ignored rather than
    // overwriting the form with provider A's data while provider B is being edited.
    resolveA!({ data: provider({ id: "provider-a", name: "Provider A", model: "model-a" }) });
    await flushPromises();

    expect(nameInput().value).toBe("Provider B");
  });
});
