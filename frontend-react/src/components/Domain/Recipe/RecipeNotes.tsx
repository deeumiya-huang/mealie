import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { icons } from "~/lib/icons";
import type { RecipeNote } from "~/lib/api/types/recipe";
import { useI18n } from "~/hooks/use-global-i18n";
import { uuid4 } from "~/hooks/use-utils";
import { BaseButton } from "~/components/global/BaseButton";
import { Icon } from "~/components/global/Icon";
import { SafeMarkdown } from "~/components/global/SafeMarkdown";
import { TextInput } from "~/components/global/form";

export function RecipeNotes({ value: model = [], onChange, edit = true }: { value?: RecipeNote[]; onChange?: (value: RecipeNote[]) => void; edit?: boolean }) {
  const i18n = useI18n();
  if (!(model.length > 0 || edit)) return null;

  const update = (index: number, patch: Partial<RecipeNote>) => onChange?.(model.map((n, i) => (i === index ? { ...n, ...patch } : n)));

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h5" component="h2" sx={{ my: 2, fontWeight: 500, opacity: 0.8 }}>{i18n.t("recipe.note")}</Typography>
      {model.map((note, index) => (
        <Box id={"note" + index} key={"note" + index} sx={{ mt: 0.5 }}>
          {edit
            ? (
                <Card>
                  <CardContent>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <TextInput value={note.title} onChange={title => update(index, { title })} variant="underlined" label={i18n.t("recipe.title")} />
                      <IconButton sx={{ mr: 1 }} onClick={() => onChange?.(model.filter((_n, i) => i !== index))}>
                        <Icon path={icons.delete} />
                      </IconButton>
                    </Box>
                    <TextInput value={note.text} onChange={text => update(index, { text })} variant="underlined" multiline autoGrow placeholder={i18n.t("recipe.note")} />
                  </CardContent>
                </Card>
              )
            : (
                <div>
                  <Typography variant="subtitle1" sx={{ fontWeight: 500, py: 0.5, px: 2 }}>{note.title}</Typography>
                  <CardContent><SafeMarkdown source={note.text} /></CardContent>
                </div>
              )}
        </Box>
      ))}
      {edit && (
        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <BaseButton sx={{ ml: "auto", my: 1 }} onClick={() => onChange?.([...model, { title: "", text: "", referenceId: uuid4() }])}>
            {i18n.t("general.add")}
          </BaseButton>
        </Box>
      )}
    </Box>
  );
}

export default RecipeNotes;
