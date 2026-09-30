import GlobalStyles from "@mui/material/GlobalStyles";
import type { Recipe } from "~/lib/api/types/recipe";
import type { NoUndefinedField } from "~/lib/api/types/non-generated";
import { RecipePrintView } from "./RecipePrintView";

/** Hidden on screen; replaces the page content when printing. */
export function RecipePrintContainer({ recipe, scale = 1 }: { recipe: Recipe; scale?: number }) {
  return (
    <>
      <GlobalStyles
        styles={{
          "@media print": {
            "body, html": { marginTop: "0 !important" },
            ".print-container": { display: "block !important" },
            ".app-main": { display: "block", padding: "0 !important", margin: "0 !important" },
          },
        }}
      />
      <div className="print-container" style={{ display: "none" }}>
        <RecipePrintView recipe={recipe as NoUndefinedField<Recipe>} scale={scale} dense />
      </div>
    </>
  );
}

export default RecipePrintContainer;
