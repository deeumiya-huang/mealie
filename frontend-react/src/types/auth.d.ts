// Session types of the auth layer. Port of frontend/app/types/auth.d.ts, which typed the
// `#auth-utils` module (nuxt-auth-utils); here `hooks/use-auth-backend.ts` uses them directly.
import type { UserOut } from "@/lib/api/types/user";

export type User = UserOut;

export type UserSession = object;

export type SecureSessionData = object;
