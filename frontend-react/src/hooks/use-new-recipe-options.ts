import { useCallback } from "react";
import { useNavigate } from "react-router";
import { useRecipeCreatePreferences } from "~/hooks/use-users/preferences";
import type { UserRecipeCreatePreferences } from "~/hooks/use-users/preferences";

export interface UseNewRecipeOptionsProps {
  enableImportKeywords?: boolean;
  enableImportCategories?: boolean;
  enableStayInEditMode?: boolean;
  enableParseRecipe?: boolean;
  enableTranslateRecipe?: boolean;
  enableCreateNewOrganizers?: boolean;
}

type Option = [value: boolean, setValue: (value: boolean) => void];

export function useNewRecipeOptions(props: UseNewRecipeOptionsProps = {}) {
  const {
    enableImportKeywords = true,
    enableImportCategories = true,
    enableStayInEditMode = true,
    enableParseRecipe = true,
    enableTranslateRecipe = false,
    enableCreateNewOrganizers = false,
  } = props;

  const navigate = useNavigate();
  const [recipeCreatePreferences, setRecipeCreatePreferences] = useRecipeCreatePreferences();

  // A disabled option always reads false and ignores writes (the Vue computed getters/setters)
  function option(enabled: boolean, key: keyof UserRecipeCreatePreferences): Option {
    return [
      enabled ? recipeCreatePreferences[key] : false,
      (v: boolean) => {
        if (!enabled) return;
        setRecipeCreatePreferences(prev => ({ ...prev, [key]: v }));
      },
    ];
  }

  const importKeywordsAsTags = option(enableImportKeywords, "importKeywordsAsTags");
  const importCategories = option(enableImportCategories, "importCategories");
  const stayInEditMode = option(enableStayInEditMode, "stayInEditMode");
  const parseRecipe = option(enableParseRecipe, "parseRecipe");
  const translateRecipe = option(enableTranslateRecipe, "translateRecipe");
  const createNewOrganizers = option(enableCreateNewOrganizers, "createNewOrganizers");

  const editParam = stayInEditMode[0];
  const parseParam = parseRecipe[0];
  const navigateToRecipe = useCallback((recipeSlug: string, groupSlug: string, createPagePath: string) => {
    const queryParams = new URLSearchParams();
    if (editParam) {
      queryParams.set("edit", "true");
    }
    if (parseParam) {
      queryParams.set("parse", "true");
    }

    const queryString = queryParams.toString();
    const recipeUrl = `/g/${groupSlug}/r/${recipeSlug}${queryString ? `?${queryString}` : ""}`;

    // Replace current entry to prevent re-import on back navigation
    void Promise.resolve(navigate(createPagePath, { replace: true })).then(() => navigate(recipeUrl));
  }, [editParam, parseParam, navigate]);

  return {
    // [value, setValue] pairs for the checkboxes
    importKeywordsAsTags,
    importCategories,
    stayInEditMode,
    parseRecipe,
    translateRecipe,
    createNewOrganizers,

    // Helper functions
    navigateToRecipe,

    // Props for conditional rendering
    enableImportKeywords,
    enableImportCategories,
    enableStayInEditMode,
    enableParseRecipe,
    enableTranslateRecipe,
    enableCreateNewOrganizers,
  };
}
