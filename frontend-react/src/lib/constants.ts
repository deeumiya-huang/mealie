/** Name of the session cookie the backend sets (was runtimeConfig.public.AUTH_TOKEN). */
export const AUTH_TOKEN = "mealie.access_token";

/** Equivalent of runtimeConfig.public.SUB_PATH. */
export const SUB_PATH = import.meta.env.BASE_URL.replace(/\/$/, "");

/** URL of a file in frontend/public (the Vue templates used absolute `/…` paths, which ignore SUB_PATH). */
export function publicUrl(path: string): string {
  return `${SUB_PATH}/${path.replace(/^\//, "")}`;
}
