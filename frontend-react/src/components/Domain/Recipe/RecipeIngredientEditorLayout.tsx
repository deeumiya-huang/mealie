// Usage: <RecipeIngredientEditorLayout header dragHandle={…} contextMenu={…} form={…} /> — lays out an ingredient editor
// row: with a header, drag handle + form + menu on one line (the form moves below the header on md and down).
// Vue's named slots `dragHandle` / `form` / `contextMenu` are props.
import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import { useDisplay } from "@/hooks/utils";

interface RecipeIngredientEditorLayoutProps {
  header: boolean;
  dragHandle?: ReactNode;
  form?: ReactNode;
  contextMenu?: ReactNode;
}

export function RecipeIngredientEditorLayout({ header, dragHandle, form, contextMenu }: RecipeIngredientEditorLayoutProps) {
  const { mdAndDown } = useDisplay();

  return (
    <>
      {header
        ? (
            <Box sx={{ display: "flex", pt: 1, alignItems: "center" }}>
              {dragHandle}
              {!mdAndDown && form}
              {contextMenu}
            </Box>
          )
        : !mdAndDown && form}
      {mdAndDown && form}
    </>
  );
}
