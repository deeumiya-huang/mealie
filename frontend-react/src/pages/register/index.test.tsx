import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { RegistrationType } from "./states";
import { useRegistrationSubmit } from "./index";
import { useGlobalI18n } from "~/hooks/use-global-i18n";

const mocks = vi.hoisted(() => ({
  register: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
  push: vi.fn(),
  resetAccount: vi.fn(),
  resetCredentials: vi.fn(),
}));

vi.mock("~/hooks/api", () => ({
  useUserApi: () => ({ register: { register: mocks.register } }),
}));
vi.mock("~/hooks/api/api-client", () => ({
  usePublicApi: () => ({ validators: { group: vi.fn() } }),
}));
vi.mock("~/hooks/use-toast", () => ({
  alert: { error: mocks.error, success: mocks.success },
}));
vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  useNavigate: () => mocks.push,
}));
vi.mock("~/hooks/use-locales", () => ({ useLocales: () => ({ locale: "en-US" }) }));
vi.mock("~/hooks/use-validators", () => ({
  validators: {},
  useAsyncValidator: () => ({ validate: vi.fn(), valid: true, errorMessages: [] }),
}));
vi.mock("~/components/Domain/User/UserRegistrationForm", () => ({ UserRegistrationForm: () => null }));
vi.mock("~/hooks/use-users/user-registration-form", () => ({
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

describe("registration result handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => vi.clearAllMocks());

  async function submit() {
    // Exercise the page's submission logic without rendering the multi-step form.
    const { result, unmount } = renderHook(() => useRegistrationSubmit());
    try {
      await act(() => result.current(RegistrationType.JoinGroup, { groupName: "", groupSeed: false, groupPrivate: false }, "invalid-token"));
    }
    finally {
      unmount();
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
    expect(mocks.error).toHaveBeenCalledExactlyOnceWith(useGlobalI18n().t("events.something-went-wrong"));
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
