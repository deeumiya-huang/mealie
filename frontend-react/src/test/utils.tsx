import i18next from "i18next";
import enUS from "@locales/messages/en-US.json";
import unitNames from "@unit-locales/en-US.json";
import type { GlobalI18n } from "@/i18n";

/** en-US messages merged like frontend/app/lang/locales/en-US.ts (unit names included). */
export function loadEnLocales(): Record<string, unknown> {
  return { ...enUS, "unit-names": unitNames };
}

/** Port of app/tests/utils.ts `stubI18n()`: a standalone en-US translator. */
export function stubI18n(): GlobalI18n {
  const instance = i18next.createInstance();
  void instance.init({
    lng: "en-US",
    fallbackLng: "en-US",
    initAsync: false,
    resources: { "en-US": { translation: loadEnLocales() } },
    interpolation: { prefix: "{", suffix: "}", escapeValue: false },
    nsSeparator: false,
    returnNull: false,
  });
  return { t: (key, params) => instance.t(key, params ?? {}) };
}
