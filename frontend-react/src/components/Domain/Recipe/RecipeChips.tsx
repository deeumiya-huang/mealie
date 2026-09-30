import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import type { RecipeCategory, RecipeTag, RecipeTool } from "~/lib/api/types/recipe";
import { truncateText as truncatePlainText } from "~/lib/sanitize/text";

export type UrlPrefixParam = "tags" | "categories" | "tools";
type Organizer = RecipeCategory | RecipeTag | RecipeTool;

export interface RecipeChipsProps {
  truncate?: boolean;
  items?: Organizer[] | null;
  title?: string | false;
  urlPrefix?: UrlPrefixParam;
  limit?: number;
  small?: boolean;
  maxWidth?: string | null;
  onItemSelected?: (item: Organizer, urlPrefix: UrlPrefixParam) => void;
}

export function RecipeChips({ truncate = false, items = [], title = false, urlPrefix = "categories", limit = 999, small = false, onItemSelected }: RecipeChipsProps) {
  const list = items ?? [];
  if (list.length === 0) return null;
  const text = (t: string) => (truncate ? truncatePlainText(t, 20, "...") : t);
  return (
    <div>
      {title && <Typography variant="h5" component="h2" sx={{ mt: 2 }}>{title}</Typography>}
      {list.slice(0, limit).map(category => (
        <Chip
          key={category.name}
          label={text(category.name)}
          color="accent"
          size={small ? "small" : "medium"}
          sx={{ mr: 0.5, mt: 0.5, borderRadius: 1 }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onItemSelected?.(category, urlPrefix);
          }}
        />
      ))}
    </div>
  );
}

export default RecipeChips;
