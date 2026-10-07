import { useNavigate } from "react-router";
import { useRecipeCreatePreferences, type UserRecipeCreatePreferences } from "@/hooks/use-users/preferences";

// Port of composables/use-new-recipe-options.ts. The writable computed refs become a value plus a setter
// (`importKeywordsAsTags` / `setImportKeywordsAsTags`, …). A disabled option always reads `false` and ignores writes.

export interface UseNewRecipeOptionsProps {
  enableImportKeywords?: boolean;
  enableImportCategories?: boolean;
  enableStayInEditMode?: boolean;
  enableParseRecipe?: boolean;
  enableTranslateRecipe?: boolean;
  enableCreateNewOrganizers?: boolean;
}

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
  const [preferences, setPreferences] = useRecipeCreatePreferences();

  function read(enabled: boolean, key: keyof UserRecipeCreatePreferences) {
    return enabled ? preferences[key] : false;
  }

  function write(enabled: boolean, key: keyof UserRecipeCreatePreferences, value: boolean) {
    if (!enabled) return;
    setPreferences(current => ({ ...current, [key]: value }));
  }

  const importKeywordsAsTags = read(enableImportKeywords, "importKeywordsAsTags");
  const importCategories = read(enableImportCategories, "importCategories");
  const stayInEditMode = read(enableStayInEditMode, "stayInEditMode");
  const parseRecipe = read(enableParseRecipe, "parseRecipe");
  const translateRecipe = read(enableTranslateRecipe, "translateRecipe");
  const createNewOrganizers = read(enableCreateNewOrganizers, "createNewOrganizers");

  async function navigateToRecipe(recipeSlug: string, groupSlug: string, createPagePath: string) {
    const queryParams = new URLSearchParams();
    if (stayInEditMode) {
      queryParams.set("edit", "true");
    }
    if (parseRecipe) {
      queryParams.set("parse", "true");
    }

    const queryString = queryParams.toString();
    const recipeUrl = `/g/${groupSlug}/r/${recipeSlug}${queryString ? `?${queryString}` : ""}`;

    // Replace current entry to prevent re-import on back navigation
    await navigate(createPagePath, { replace: true });
    await navigate(recipeUrl);
  }

  return {
    // Values and setters for the checkboxes
    importKeywordsAsTags,
    setImportKeywordsAsTags: (value: boolean) => write(enableImportKeywords, "importKeywordsAsTags", value),
    importCategories,
    setImportCategories: (value: boolean) => write(enableImportCategories, "importCategories", value),
    stayInEditMode,
    setStayInEditMode: (value: boolean) => write(enableStayInEditMode, "stayInEditMode", value),
    parseRecipe,
    setParseRecipe: (value: boolean) => write(enableParseRecipe, "parseRecipe", value),
    translateRecipe,
    setTranslateRecipe: (value: boolean) => write(enableTranslateRecipe, "translateRecipe", value),
    createNewOrganizers,
    setCreateNewOrganizers: (value: boolean) => write(enableCreateNewOrganizers, "createNewOrganizers", value),

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
