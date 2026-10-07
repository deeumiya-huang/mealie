// Usage: <RecipeYield yieldQuantity={recipe.recipeYieldQuantity} yieldText={recipe.recipeYield} scale={scale} />
// The "Yield" line of the recipe info card (scaled quantity + yield text); nothing when both are empty.
import DOMPurify from "dompurify";
import Box from "@mui/material/Box";
import { MdiIcon } from "@/components/global/MdiIcon";
import { useScaledAmount } from "@/hooks/recipes/use-scaled-amount";
import { useI18n } from "@/i18n";
import { icons } from "@/lib/icons";

interface RecipeYieldProps {
  yieldQuantity?: number;
  yieldText?: string;
  scale?: number;
  color?: string;
  className?: string;
}

function sanitizeHTML(rawHtml: string) {
  return DOMPurify.sanitize(rawHtml, {
    USE_PROFILES: { html: true },
    ALLOWED_TAGS: ["strong", "sup"],
  });
}

export function RecipeYield({ yieldQuantity = 0, yieldText = "", scale = 1, className }: RecipeYieldProps) {
  const { t } = useI18n();

  const components: string[] = [];

  const { scaledAmountDisplay } = useScaledAmount(yieldQuantity, scale);
  if (scaledAmountDisplay) {
    components.push(scaledAmountDisplay);
  }

  if (yieldText) {
    components.push(yieldText);
  }

  const yieldDisplay = sanitizeHTML(components.join(" "));

  if (!yieldDisplay) {
    return null;
  }

  return (
    <Box className={className} sx={{ display: "flex", alignItems: "center" }}>
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", fontSize: "larger" }}>
        <MdiIcon path={icons.bread} size="large" sx={{ color: "primary.main", mr: 1 }} />
        <Box component="p" sx={{ my: 0, opacity: 0.8 }}>
          <Box component="span" sx={{ fontWeight: "bold" }}>{t("recipe.yield")}</Box>
          <br />
          {/* sanitized above (DOMPurify, strong/sup only) */}
          <span dangerouslySetInnerHTML={{ __html: yieldDisplay }} />
        </Box>
      </Box>
    </Box>
  );
}
