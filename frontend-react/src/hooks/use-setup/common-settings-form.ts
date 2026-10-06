import { fieldTypes } from "@/hooks/forms";
import { validators } from "@/hooks/use-validators";
import { useI18n } from "@/i18n";
import type { AutoFormItems } from "@/types/auto-forms";

// Port of composables/use-setup/common-settings-form.ts: the two fields shared by every setup step form.
export const useCommonSettingsForm = () => {
  const { t } = useI18n();

  const commonSettingsForm: AutoFormItems = [
    {
      section: t("profile.group-settings"),
      label: t("group.enable-public-access"),
      hint: t("group.enable-public-access-description"),
      varName: "makeGroupRecipesPublic",
      type: fieldTypes.BOOLEAN,
      rules: [validators.required],
    },
    {
      section: t("data-pages.data-management"),
      label: t("user-registration.use-seed-data"),
      hint: t("user-registration.use-seed-data-description"),
      varName: "useSeedData",
      type: fieldTypes.BOOLEAN,
      rules: [validators.required],
    },
  ];

  return {
    commonSettingsForm,
  };
};
