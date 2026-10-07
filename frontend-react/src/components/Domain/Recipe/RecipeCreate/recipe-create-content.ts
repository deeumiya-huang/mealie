// Content handling shared by the html and ai importers (pages/g/[groupSlug]/r/create/{html,ai}.tsx): the content
// is either the raw text of a textarea or an object edited in the JSON editor.
export type RecipeImportContent = string | object | null;

/**
 * Converts the content when the "JSON editor" switch changes (Vue `handleIsEditJson`, which ran after the model
 * update, so `editJson` is the new state of the switch).
 */
export function convertImportContent(data: RecipeImportContent, editJson: boolean): RecipeImportContent {
  if (editJson) {
    if (data) {
      try {
        // JSON.parse yields whatever the text holds; the Vue page stored it unchecked as well
        return JSON.parse(data as string) as RecipeImportContent;
      }
      catch {
        return { data };
      }
    }
    return {};
  }

  if (data && Object.keys(data).length > 0) {
    return JSON.stringify(data);
  }
  return null;
}

/** The content as the string that is sent to the backend (`null` when there is none). */
export function importContentAsString(data: RecipeImportContent): string | null {
  if (!data) {
    return null;
  }
  return typeof data === "string" ? data : JSON.stringify(data);
}
