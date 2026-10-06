// Usage: <RecipeChips items={recipe.tags} urlPrefix="tags" limit={2} small truncate title="Tags" onItemSelected={(item, prefix) => …} />
// A wrapping row of accent chips (one per category/tag/tool); clicking one calls `onItemSelected(item, urlPrefix)`.
// `title` (Vue boolean prop, only ever used as a flag) shows an h2 with the given text.
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import type { RecipeCategory, RecipeTag, RecipeTool } from "@/lib/api/types/recipe";
import { truncateText as truncatePlainText } from "@/lib/sanitize/text";

export type UrlPrefixParam = "tags" | "categories" | "tools";

interface RecipeChipsProps {
  truncate?: boolean;
  items?: RecipeCategory[] | RecipeTag[] | RecipeTool[];
  title?: boolean | string;
  urlPrefix?: UrlPrefixParam;
  limit?: number;
  small?: boolean;
  maxWidth?: string | null;
  className?: string;
  onItemSelected?: (item: RecipeCategory | RecipeTag | RecipeTool, urlPrefix: UrlPrefixParam) => void;
}

export function RecipeChips({
  truncate = false,
  items = [],
  title = false,
  urlPrefix = "categories",
  limit = 999,
  small = false,
  className,
  onItemSelected,
}: RecipeChipsProps) {
  function truncateText(text: string, length = 20, clamp = "...") {
    if (!truncate) return text;
    return truncatePlainText(text, length, clamp);
  }

  if (items.length === 0) {
    return null;
  }

  const list: Array<RecipeCategory | RecipeTag | RecipeTool> = items;

  return (
    <Box className={className}>
      {typeof title === "string" && title && (
        <Box component="h2" sx={{ mt: 2 }}>
          {title}
        </Box>
      )}
      {list.slice(0, limit).map(category => (
        <Chip
          key={category.name}
          label={truncateText(category.name)}
          color="accent"
          size={small ? "small" : "medium"}
          sx={{ borderRadius: "4px", mr: 0.5, mt: 0.5 }}
          onClick={(event) => {
            event.preventDefault();
            onItemSelected?.(category, urlPrefix);
          }}
        />
      ))}
    </Box>
  );
}
