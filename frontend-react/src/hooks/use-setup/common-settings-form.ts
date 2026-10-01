import { fieldTypes } from "~/hooks/forms";
import { useI18n } from "~/hooks/use-global-i18n";
import { validators } from "~/hooks/use-validators";
import type { AutoFormItems } from "~/types/auto-forms";

/** AutoForm fields for the first-time setup wizard's "site settings" step. */
export const useCommonSettingsForm = () => {
  const i18n = useI18n();

  const commonSettingsForm: AutoFormItems = [
    {
      section: i18n.t("profile.group-settings"),
      label: i18n.t("group.enable-public-access"),
      hint: i18n.t("group.enable-public-access-description"),
      varName: "makeGroupRecipesPublic",
      type: fieldTypes.BOOLEAN,
      rules: [validators.required],
    },
    {
      section: i18n.t("data-pages.data-management"),
      label: i18n.t("user-registration.use-seed-data"),
      hint: i18n.t("user-registration.use-seed-data-description"),
      varName: "useSeedData",
      type: fieldTypes.BOOLEAN,
      rules: [validators.required],
    },
  ];

  return {
    commonSettingsForm,
  };
};
