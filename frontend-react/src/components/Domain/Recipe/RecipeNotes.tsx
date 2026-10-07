// Usage: <RecipeNotes value={recipe.notes} onChange={notes => …} edit={isEditForm} /> — the recipe's notes: markdown
// cards to read, or title/text fields with delete and "Add" while editing. (Vue `v-model` → `value` + `onChange`.)
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { BaseButton } from "@/components/global/BaseButton";
import { MdiIcon } from "@/components/global/MdiIcon";
import { SafeMarkdown } from "@/components/global/SafeMarkdown";
import { uuid4 } from "@/hooks/use-utils";
import { useI18n } from "@/i18n";
import type { RecipeNote } from "@/lib/api/types/recipe";
import { icons } from "@/lib/icons";

interface RecipeNotesProps {
  value?: RecipeNote[];
  onChange?: (value: RecipeNote[]) => void;
  edit?: boolean;
}

export function RecipeNotes({ value = [], onChange, edit = true }: RecipeNotesProps) {
  const { t } = useI18n();
  const model = value;

  function addNote() {
    onChange?.([...model, { title: "", text: "", referenceId: uuid4() }]);
  }

  function removeByIndex(index: number) {
    const newNotes = [...model];
    newNotes.splice(index, 1);
    onChange?.(newNotes);
  }

  function updateNote(index: number, patch: Partial<RecipeNote>) {
    onChange?.(model.map((note, i) => (i === index ? { ...note, ...patch } : note)));
  }

  if (!(model.length > 0 || edit)) {
    return null;
  }

  return (
    <Box sx={{ mt: 8 }}>
      <Typography variant="h5" component="h2" sx={{ my: 4, fontWeight: 500, opacity: 0.8 }}>
        {t("recipe.note")}
      </Typography>
      {model.map((note, index) => (
        <Box key={"note" + index} id={"note" + index} sx={{ mt: 1 }}>
          {edit
            ? (
                <Card>
                  <CardContent>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <TextField
                        value={note.title}
                        onChange={e => updateNote(index, { title: e.target.value })}
                        variant="standard"
                        label={t("recipe.title")}
                        fullWidth
                      />
                      <IconButton sx={{ mr: 1 }} aria-label={t("general.delete")} onClick={() => removeByIndex(index)}>
                        <MdiIcon path={icons.delete} />
                      </IconButton>
                    </Box>
                    <TextField
                      value={note.text}
                      onChange={e => updateNote(index, { text: e.target.value })}
                      variant="standard"
                      multiline
                      minRows={1}
                      fullWidth
                      placeholder={t("recipe.note")}
                      sx={{ mt: 2 }}
                    />
                  </CardContent>
                </Card>
              )
            : (
                <div>
                  <Typography variant="subtitle1" component="div" sx={{ fontWeight: 500, py: 0.5, px: 2 }}>
                    {note.title}
                  </Typography>
                  <Box sx={{ px: 2, pb: 2 }}>
                    <SafeMarkdown source={note.text} />
                  </Box>
                </div>
              )}
        </Box>
      ))}

      {edit && (
        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Box sx={{ ml: "auto", my: 1 }}>
            <BaseButton onClick={addNote}>
              {t("general.add")}
            </BaseButton>
          </Box>
        </Box>
      )}
    </Box>
  );
}
