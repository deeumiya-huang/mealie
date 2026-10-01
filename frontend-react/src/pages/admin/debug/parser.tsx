import { useState } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Chip from "@mui/material/Chip";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { BaseButton } from "~/components/global/BaseButton";
import { BaseCardSectionTitle } from "~/components/global/BaseCardSectionTitle";
import { BaseContainer } from "~/components/global/BaseContainer";
import { CheckboxInput, TextInput } from "~/components/global/form";
import { useUserApi } from "~/hooks/api";
import { useI18n } from "~/hooks/use-global-i18n";
import { useSeoMeta } from "~/hooks/use-seo-meta";
import { alert } from "~/hooks/use-toast";
import type { IngredientConfidence } from "~/lib/api/types/recipe";
import type { Parser } from "~/lib/api/user/recipes/recipe";
import { icons } from "~/lib/icons";

type ConfidenceAttribute = "average" | "comment" | "name" | "unit" | "quantity" | "food";
type ResultAttribute = "quantity" | "unit" | "food" | "comment";
type ChipColor = "success" | "warning" | "error";

interface ResultProperty {
  subtitle: string;
  value: string | number;
  color: ChipColor | null;
  confidence: string | null;
}

const tryText = [
  "2 tbsp minced cilantro, leaves and stems",
  "1 large yellow onion, coarsely chopped",
  "1 1/2 tsp garam masala",
  "1 inch piece fresh ginger, (peeled and minced)",
  "2 cups mango chunks, (2 large mangoes) (fresh or frozen)",
];

function getConfidence(confidence: IngredientConfidence, attribute: ConfidenceAttribute) {
  const property = confidence[attribute];
  if (property !== undefined && property !== null) {
    return `${(+property * 100).toFixed(0)}%`;
  }
  return undefined;
}

function getColor(confidence: IngredientConfidence, attribute: ConfidenceAttribute): ChipColor | undefined {
  const percentage = getConfidence(confidence, attribute);
  if (percentage === undefined) return;

  const asNumber = parseFloat(percentage.replace("%", ""));

  // Set color based off range
  if (asNumber > 75) {
    return "success";
  }
  else if (asNumber > 60) {
    return "warning";
  }
  else {
    return "error";
  }
}

export default function AdminDebugParserPage() {
  const api = useUserApi();
  const i18n = useI18n();

  useSeoMeta({ title: i18n.t("admin.parser") });

  const [ingredient, setIngredient] = useState("");
  const [results, setResults] = useState(false);
  const [parser, setParser] = useState<Parser>("nlp");
  const [confidence, setConfidence] = useState<IngredientConfidence>({});
  const [showConfidence, setShowConfidence] = useState(false);

  const emptyProperties = (): Record<ResultAttribute, ResultProperty> => ({
    quantity: { subtitle: i18n.t("recipe.quantity"), value: "", color: null, confidence: null },
    unit: { subtitle: i18n.t("recipe.unit"), value: "", color: null, confidence: null },
    food: { subtitle: i18n.t("shopping-list.food"), value: "", color: null, confidence: null },
    comment: { subtitle: i18n.t("recipe.comment"), value: "", color: null, confidence: null },
  });
  const [properties, setProperties] = useState(emptyProperties);

  async function processIngredient(text = ingredient, withParser = parser) {
    if (text === "") {
      return;
    }

    const { data } = await api.recipes.parseIngredient(withParser, text);

    if (data) {
      setResults(true);
      const nextConfidence = data.confidence ?? confidence;
      if (data.confidence) setConfidence(data.confidence);

      const next = emptyProperties();
      next.comment.value = data.ingredient.note || "";
      next.quantity.value = data.ingredient.quantity || "";
      next.unit.value = data.ingredient?.unit?.name || "";
      next.food.value = data.ingredient?.food?.name || "";

      (["comment", "quantity", "unit", "food"] as ResultAttribute[]).forEach((property) => {
        next[property].color = getColor(nextConfidence, property) ?? null;
        next[property].confidence = getConfidence(nextConfidence, property) ?? null;
      });
      setProperties(next);
    }
    else {
      alert.error(i18n.t("events.something-went-wrong"));
      setResults(false);
    }
  }

  function processTryText(str: string) {
    setIngredient(str);
    void processIngredient(str);
  }

  const average = getConfidence(confidence, "average");

  return (
    <BaseContainer sx={{ p: 0 }}>
      <BaseContainer>
        <BaseCardSectionTitle title={i18n.t("admin.ingredients-natural-language-processor")}>
          {i18n.t("admin.ingredients-natural-language-processor-explanation")}
          <Box component="p" sx={{ pt: 1.5 }}>
            {i18n.t("admin.ingredients-natural-language-processor-explanation-2")}
          </Box>
        </BaseCardSectionTitle>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: { xs: "center", md: "flex-start" }, flexWrap: "wrap" }}>
          <ToggleButtonGroup
            value={parser}
            exclusive
            size="small"
            onChange={(_e, value: Parser | null) => {
              // mandatory: ignore clicks on the selected button
              if (!value) return;
              setParser(value);
              void processIngredient(ingredient, value);
            }}
          >
            <ToggleButton value="nlp">{i18n.t("admin.nlp")}</ToggleButton>
            <ToggleButton value="brute">{i18n.t("admin.brute")}</ToggleButton>
            <ToggleButton value="openai">{i18n.t("admin.openai")}</ToggleButton>
          </ToggleButtonGroup>
          <Box sx={{ flexGrow: 1 }} />
          <CheckboxInput
            checked={showConfidence}
            onChange={setShowConfidence}
            label={i18n.t("admin.show-individual-confidence")}
            hideDetails
            sx={{ ml: 2.5 }}
          />
        </Box>
        <Card elevation={0}>
          <Box sx={{ p: 2 }}>
            <TextInput value={ingredient} onChange={setIngredient} label={i18n.t("admin.ingredient-text")} />
          </Box>
          <Box sx={{ display: "flex", p: 1 }}>
            <Box sx={{ ml: "auto" }}>
              <BaseButton icon={icons.check} onClick={() => void processIngredient()}>
                {i18n.t("general.submit")}
              </BaseButton>
            </Box>
          </Box>
        </Card>
      </BaseContainer>
      {results && (
        <BaseContainer>
          {parser !== "brute" && average && (
            <Box sx={{ display: "flex" }}>
              <Chip color={getColor(confidence, "average")} sx={{ mx: "auto", mb: 1 }} label={i18n.t("admin.average-confident", [average])} />
            </Box>
          )}
          <Box sx={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "1.5rem" }}>
            {Object.entries(properties).map(([key, prop]) => prop.value
              ? (
                  <Box key={key} sx={{ flexGrow: 1 }}>
                    <Card sx={{ minWidth: 200 }}>
                      <Typography variant="h6" sx={{ px: 2, pt: 2 }}>{prop.value}</Typography>
                      <Box sx={{ p: 2, pt: 1 }}>{prop.subtitle}</Box>
                    </Card>
                    {prop.confidence && showConfidence && (
                      <Chip color={prop.color ?? undefined} sx={{ mt: 1 }} label={i18n.t("admin.average-confident", [prop.confidence])} />
                    )}
                  </Box>
                )
              : null)}
          </Box>
        </BaseContainer>
      )}
      <BaseContainer className="narrow-container">
        <Typography variant="h6" sx={{ px: 2, pt: 2 }}>{i18n.t("admin.try-an-example")}</Typography>
        {tryText.map((text, idx) => (
          <Card key={idx} sx={{ my: 1 }}>
            <CardActionArea onClick={() => processTryText(text)} sx={{ p: 2 }}>
              {text}
            </CardActionArea>
          </Card>
        ))}
      </BaseContainer>
    </BaseContainer>
  );
}
