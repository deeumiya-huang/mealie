import { RecipeJsonEditor } from "~/components/global/RecipeJsonEditor";
import { TextInput } from "~/components/global/form";

export type RecipeData = string | object | null;

/** Converts the pasted data when the JSON editor is switched on or off (the Vue `handleIsEditJson`). */
export function convertRecipeData(isEditJSON: boolean, data: RecipeData): RecipeData {
  if (isEditJSON) {
    if (data) {
      try {
        return JSON.parse(data as string) as object;
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

export function recipeDataAsString(data: RecipeData): string | null {
  if (!data) {
    return null;
  }
  return typeof data === "string" ? data : JSON.stringify(data);
}

export interface RecipeCreateDataInputProps {
  isEditJSON: boolean;
  value: RecipeData;
  onChange: (value: RecipeData) => void;
  label: string;
  icon: string;
  hint?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}

/** Raw HTML/JSON/text input with an optional JSON editor, shared by the HTML and AI importers. */
export function RecipeCreateDataInput({ isEditJSON, value, onChange, label, icon, hint, autoFocus, disabled }: RecipeCreateDataInputProps) {
  if (isEditJSON) {
    return (
      <RecipeJsonEditor
        value={(value ?? {}) as object}
        onChange={onChange}
        height="250px"
        mode="code"
        mainMenuBar={false}
      />
    );
  }
  return (
    <TextInput
      value={(value as string | null) ?? ""}
      onChange={v => onChange(v || null)}
      label={label}
      prependInnerIcon={icon}
      variant="solo-filled"
      clearable
      multiline
      rows={5}
      autoFocus={autoFocus}
      hint={hint}
      persistentHint={!!hint}
      disabled={disabled}
    />
  );
}
