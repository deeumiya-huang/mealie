import type { ReactNode } from "react";
import { act, renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { useRegisterPage } from "./use-register-page";
import { getGlobalI18n } from "@/i18n";

const mocks = vi.hoisted(() => ({
  register: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
  push: vi.fn(),
  resetAccount: vi.fn(),
  resetCredentials: vi.fn(),
}));

vi.mock("@/hooks/api", () => ({
  useUserApi: () => ({ register: { register: mocks.register } }),
}));
vi.mock("@/hooks/api/api-client", () => ({
  usePublicApi: () => ({ validators: { group: vi.fn() } }),
}));
vi.mock("@/hooks/use-toast", () => ({
  alert: { error: mocks.error, success: mocks.success },
}));
vi.mock("@/hooks/use-router", () => ({ useRouteQuery: () => ["invalid-token", vi.fn()] }));
vi.mock("@/hooks/use-locales", () => ({ useLocales: () => ({ locale: "en-US" }) }));
vi.mock("@/hooks/use-validators", () => ({
  validators: {},
  useAsyncValidator: () => ({ validate: vi.fn(), valid: true, errorMessages: [] }),
}));
vi.mock("@/components/Domain/User/UserRegistrationForm", () => ({ UserRegistrationForm: () => null }));
vi.mock("@/hooks/use-users/user-registration-form", () => ({
  useUserRegistrationForm: () => ({
    accountDetails: {
      email: "user@example.com",
      username: "user",
      fullName: "Test User",
      advancedOptions: false,
      reset: mocks.resetAccount,
    },
    credentials: {
      password1: "password",
      password2: "password",
      reset: mocks.resetCredentials,
    },
  }),
}));
vi.mock("react-router", async importOriginal => ({
  ...await importOriginal<typeof import("react-router")>(),
  useNavigate: () => mocks.push,
}));

describe("registration result handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => vi.unstubAllGlobals());

  async function submit() {
    // Exercise the page's submission logic without rendering the multi-step form.
    const wrapper = renderHook(() => useRegisterPage(), {
      wrapper: ({ children }: { children: ReactNode }) => <MemoryRouter>{children}</MemoryRouter>,
    });
    try {
      await act(async () => {
        await wrapper.result.current.submitRegistration();
      });
    }
    finally {
      wrapper.unmount();
    }
  }

  test("does not add a generic error when the interceptor handles detail.message", async () => {
    mocks.register.mockResolvedValue({
      response: null,
      error: { response: { data: { detail: { message: "Invalid group token" } } } },
    });
    await submit();
    expect(mocks.error).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
    expect(mocks.resetAccount).not.toHaveBeenCalled();
  });

  test.each([
    null,
    { response: { data: { detail: "Invalid group token" } } },
    { response: { data: { detail: { message: "" } } } },
    { response: { data: { detail: [{ msg: "Field required" }] } } },
  ])("keeps the fallback for errors not shown by the interceptor: %j", async (error) => {
    mocks.register.mockResolvedValue({ response: null, error });
    await submit();
    expect(mocks.error).toHaveBeenCalledExactlyOnceWith(getGlobalI18n().t("events.something-went-wrong"));
    expect(mocks.push).not.toHaveBeenCalled();
  });

  test("resets the form and redirects after successful registration", async () => {
    mocks.register.mockResolvedValue({ response: { status: 201 }, error: null });
    await submit();
    expect(mocks.resetAccount).toHaveBeenCalledOnce();
    expect(mocks.resetCredentials).toHaveBeenCalledOnce();
    expect(mocks.success).toHaveBeenCalledOnce();
    expect(mocks.push).toHaveBeenCalledExactlyOnceWith("/login");
    expect(mocks.error).not.toHaveBeenCalled();
  });
});
