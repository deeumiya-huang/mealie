import DOMPurify from "dompurify";
import Box from "@mui/material/Box";
import { icons } from "~/lib/icons";
import { getScaledAmount } from "~/hooks/recipes/use-scaled-amount";
import { useI18n } from "~/hooks/use-global-i18n";
import { Icon } from "~/components/global/Icon";

function sanitizeHTML(rawHtml: string) {
  return DOMPurify.sanitize(rawHtml, { USE_PROFILES: { html: true }, ALLOWED_TAGS: ["strong", "sup"] });
}

export function RecipeYield({ yieldQuantity = 0, yieldText = "", scale = 1, className }: { yieldQuantity?: number; yieldText?: string; scale?: number; color?: string; className?: string }) {
  const i18n = useI18n();
  const components: string[] = [];
  const { scaledAmountDisplay } = getScaledAmount(yieldQuantity, scale);
  if (scaledAmountDisplay) components.push(scaledAmountDisplay);
  if (yieldText) components.push(yieldText);
  const yieldDisplay = sanitizeHTML(components.join(" "));
  if (!yieldDisplay) return null;

  return (
    <Box className={className} sx={{ display: "flex", alignItems: "center" }}>
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", fontSize: "larger" }}>
        <Icon path={icons.bread} size="large" start color="primary" />
        <p style={{ margin: 0, opacity: 0.8 }}>
          <span style={{ fontWeight: "bold" }}>{i18n.t("recipe.yield")}</span>
          <br />
          {/* Sanitized above (strong/sup only). */}
          <span dangerouslySetInnerHTML={{ __html: yieldDisplay }} />
        </p>
      </Box>
    </Box>
  );
}

export default RecipeYield;
