import { page, type DomainRoutes } from "./lazy";

// Domain "auth" (PROCESS.md §1.7): index, login, register, forgot-password, reset-password.
export const authRoutes: DomainRoutes = {
  blank: [
    { index: true, ...page(() => import("@/pages/index")) },
    { path: "login", ...page(() => import("@/pages/login")) },
    { path: "register", ...page(() => import("@/pages/register/index")) },
  ],
  basic: [
    { path: "forgot-password", ...page(() => import("@/pages/forgot-password")) },
    { path: "reset-password", ...page(() => import("@/pages/reset-password")) },
  ],
};
