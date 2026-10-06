import { useState } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import FormControlLabel from "@mui/material/FormControlLabel";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { BaseButton } from "@/components/global/BaseButton";
import { BaseCardSectionTitle } from "@/components/global/BaseCardSectionTitle";
import { useUserApi } from "@/hooks/api";
import { alert } from "@/hooks/use-toast";
import { usePageTitle } from "@/hooks/utils";
import { useI18n } from "@/i18n";
import type { IngredientConfidence } from "@/lib/api/types/recipe";
import type { Parser } from "@/lib/api/user/recipes/recipe";
import { icons } from "@/lib/icons";

type ConfidenceAttribute = "average" | "comment" | "name" | "unit" | "quantity" | "food";
type PropertyName = "quantity" | "unit" | "food" | "comment";
type ChipColor = "success" | "warning" | "error";

interface ParsedProperty {
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

function getConfidence(confidence: IngredientConfidence | null, attribute: ConfidenceAttribute) {
  if (!confidence) {
    return;
  }

  const property = confidence[attribute];
  if (property !== undefined && property !== null) {
    return `${(+property * 100).toFixed(0)}%`;
  }
  return undefined;
}

function getColor(confidence: IngredientConfidence | null, attribute: ConfidenceAttribute): ChipColor | undefined {
  const percentage = getConfidence(confidence, attribute);
  if (percentage === undefined) return;

  const percentageAsNumber = parseFloat(percentage.replace("%", ""));

  // Set color based off range
  if (percentageAsNumber > 75) {
    return "success";
  }
  else if (percentageAsNumber > 60) {
    return "warning";
  }
  else {
    return "error";
  }
}

const emptyProperty = (): ParsedProperty => ({ value: "", color: null, confidence: null });

export default function AdminDebugParserPage() {
  const { t } = useI18n();
  const api = useUserApi();

  // Set page title
  usePageTitle(t("admin.parser"));

  const [ingredient, setIngredient] = useState("");
  const [results, setResults] = useState(false);
  const [parser, setParser] = useState<Parser>("nlp");
  const [showConfidence, setShowConfidence] = useState(false);

  const [confidence, setConfidence] = useState<IngredientConfidence | null>({});
  const [properties, setProperties] = useState<Record<PropertyName, ParsedProperty>>({
    quantity: emptyProperty(),
    unit: emptyProperty(),
    food: emptyProperty(),
    comment: emptyProperty(),
  });

  const propertySubtitles: Record<PropertyName, string> = {
    quantity: t("recipe.quantity"),
    unit: t("recipe.unit"),
    food: t("shopping-list.food"),
    comment: t("recipe.comment"),
  };
  const propertyOrder: PropertyName[] = ["quantity", "unit", "food", "comment"];

  async function processIngredient(text: string = ingredient) {
    if (text === "") {
      return;
    }

    const { data } = await api.recipes.parseIngredient(parser, text);

    if (data) {
      setResults(true);

      // the previous confidence stays when the response carries none
      const currentConfidence = data.confidence ? data.confidence : confidence;
      if (data.confidence) setConfidence(data.confidence);

      setProperties((current) => {
        const next: Record<PropertyName, ParsedProperty> = {
          comment: { ...current.comment, value: data.ingredient.note || "" },
          quantity: { ...current.quantity, value: data.ingredient.quantity || "" },
          unit: { ...current.unit, value: data.ingredient?.unit?.name || "" },
          food: { ...current.food, value: data.ingredient?.food?.name || "" },
        };

        (["comment", "quantity", "unit", "food"] as PropertyName[]).forEach((property) => {
          const color = getColor(currentConfidence, property);
          const propertyConfidence = getConfidence(currentConfidence, property);
          if (color) {
            next[property].color = color;
          }
          if (propertyConfidence) {
            next[property].confidence = propertyConfidence;
          }
        });
        return next;
      });
    }
    else {
      alert.error(t("events.something-went-wrong"));
      setResults(false);
    }
  }

  function processTryText(str: string) {
    setIngredient(str);
    void processIngredient(str);
  }

  const averageConfidence = getConfidence(confidence, "average");

  return (
    <Container disableGutters sx={{ p: 0 }}>
      <Container>
        <BaseCardSectionTitle title={t("admin.ingredients-natural-language-processor")}>
          {t("admin.ingredients-natural-language-processor-explanation")}

          <Box component="p" sx={{ pt: 1.5 }}>
            {t("admin.ingredients-natural-language-processor-explanation-2")}
          </Box>
        </BaseCardSectionTitle>

        <Box sx={{ display: "flex", alignItems: "center", justifyContent: { xs: "center", md: "flex-start" }, flexWrap: "wrap" }}>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={parser}
            onChange={(_event, value: Parser | null) => {
              // mandatory: one parser always stays selected
              if (value !== null) setParser(value);
            }}
          >
            <ToggleButton value="nlp">
              {t("admin.nlp")}
            </ToggleButton>
            <ToggleButton value="brute">
              {t("admin.brute")}
            </ToggleButton>
            <ToggleButton value="openai">
              {t("admin.openai")}
            </ToggleButton>
          </ToggleButtonGroup>
          <Box sx={{ flexGrow: 1 }} />
          <FormControlLabel
            sx={{ ml: 2.5 }}
            control={<Checkbox checked={showConfidence} onChange={event => setShowConfidence(event.target.checked)} />}
            label={t("admin.show-individual-confidence")}
          />
        </Box>

        <Card elevation={0}>
          <CardContent>
            <TextField
              fullWidth
              variant="filled"
              label={t("admin.ingredient-text")}
              value={ingredient}
              onChange={event => setIngredient(event.target.value)}
            />
          </CardContent>
          <CardActions>
            <BaseButton sx={{ ml: "auto" }} icon={icons.check} onClick={() => void processIngredient()}>
              {t("general.submit")}
            </BaseButton>
          </CardActions>
        </Card>
      </Container>
      {results && (
        <Container>
          {parser !== "brute" && averageConfidence && (
            <Box sx={{ display: "flex" }}>
              <Chip
                color={getColor(confidence, "average")}
                sx={{ mx: "auto", mb: 1 }}
                label={t("admin.average-confident", [averageConfidence])}
              />
            </Box>
          )}
          <Box sx={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "1.5rem" }}>
            {propertyOrder.map(name => properties[name].value
              ? (
                  <Box key={name} sx={{ flexGrow: 1 }}>
                    <Card sx={{ minWidth: 200 }}>
                      <Typography variant="h6" component="div" sx={{ p: 2, pb: 0 }}>{properties[name].value}</Typography>
                      <CardContent>
                        {propertySubtitles[name]}
                      </CardContent>
                    </Card>
                    {properties[name].confidence && showConfidence && (
                      <Chip
                        color={properties[name].color ?? undefined}
                        sx={{ mt: 1 }}
                        label={t("admin.average-confident", [properties[name].confidence])}
                      />
                    )}
                  </Box>
                )
              : null)}
          </Box>
        </Container>
      )}
      <Container sx={{ maxWidth: "800px !important" }}>
        <Typography variant="h6" component="div" sx={{ p: 2 }}>{t("admin.try-an-example")}</Typography>
        {tryText.map(text => (
          <Card key={text} sx={{ my: 1 }}>
            <CardActionArea onClick={() => processTryText(text)}>
              <CardContent>{text}</CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Container>
    </Container>
  );
}
