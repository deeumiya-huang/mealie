// Usage: <QueryFilterBuilder fieldDefs={fieldDefs} initialQueryFilter={cookbook.queryFilter}
//          onInput={qf => setQueryFilterString(qf)} onInputJSON={json => setQueryFilterJSON(json)} />
// Visual editor for a recipe query filter: one row per condition (and/or, parentheses, field, operator, value),
// reorderable by dragging the handle. `onInput` / `onInputJSON` (Vue `@input` / `@inputJSON`) fire 500 ms after the
// last change with the filter string / JSON, or undefined while the filter is incomplete.
import { useEffect, useRef, useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import Popover from "@mui/material/Popover";
import TextField from "@mui/material/TextField";
import { useTheme } from "@mui/material/styles";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { enUS, type Locale } from "date-fns/locale";
import { format } from "date-fns";
import { BaseButton } from "@/components/global/BaseButton";
import { BaseButtonGroup } from "@/components/global/BaseButtonGroup";
import { BaseNumberInput } from "@/components/global/BaseNumberInput";
import { MdiIcon } from "@/components/global/MdiIcon";
import { RecipeOrganizerSelector, type RecipeOrganizerItem } from "@/components/Domain/Recipe/RecipeOrganizerSelector";
import { RecipeTimeInput } from "@/components/Domain/Recipe/RecipeTimeInput";
import { useCategoryStore, useFoodStore, useHouseholdStore, useLabelStore, useTagStore, useToolStore } from "@/hooks/store";
import { useUserStore } from "@/hooks/store/use-user-store";
import { useHouseholdSelf } from "@/hooks/use-households";
import {
  useQueryFilterBuilder,
  type Field,
  type FieldDefinition,
  type FieldValue,
  type OrganizerBase,
} from "@/hooks/use-query-filter-builder";
import { useDebouncedCallback, useDisplay } from "@/hooks/utils";
import { moveItem, useSortable } from "@/hooks/utils/use-sortable";
import { useI18n } from "@/i18n";
import { Organizer, type RecipeOrganizer } from "@/lib/api/types/non-generated";
import type {
  LogicalOperator,
  QueryFilterJSON,
  QueryFilterJSONPart,
  RelationalKeyword,
  RelationalOperator,
} from "@/lib/api/types/non-generated";
import { icons } from "@/lib/icons";

export interface QueryFilterBuilderProps {
  fieldDefs: FieldDefinition[];
  initialQueryFilter?: QueryFilterJSON | null;
  onInput?: (value: string | undefined) => void;
  onInputJSON?: (value: QueryFilterJSON | undefined) => void;
}

// an id on every field keeps React's row identity stable while rows are reordered
type FieldWithId = Field & { id: number };

/** The shared stores only need to be read as lists of organizers here. */
interface OrganizerStore {
  store: OrganizerBase[];
  getAll: () => Promise<OrganizerBase[]>;
}

type GridSpan = number | "auto" | true;

function gridSize(span: GridSpan): number | "auto" | "grow" {
  // Vuetify `cols="0"` / `sm` as `true` take the space that is left
  return span === 0 || span === true ? "grow" : span;
}

interface ColProps {
  cols: GridSpan;
  sm: GridSpan;
  /** Padding of the column (Vuetify `pa-0` on the drag handle column). */
  noPadding?: boolean;
  children?: ReactNode;
}

function Col({ cols, sm, noPadding = false, children }: ColProps) {
  return (
    <Grid
      size={{ xs: gridSize(cols), sm: gridSize(sm) }}
      sx={{ display: "flex", justifyContent: "center", alignItems: "flex-end", py: 0, ...(noPadding ? { p: 0 } : {}) }}
    >
      {children}
    </Grid>
  );
}

const LEFT_PARENS = ["", "(", "((", "((("];
const RIGHT_PARENS = ["", ")", "))", ")))"];

function safeNewDate(input: string): Date {
  const date = new Date(input);
  if (isNaN(date.getTime())) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }
  return date;
}

/** A date-fns locale whose month/weekday names come from Intl (so every UI language is covered) and that starts the week on `weekStartsOn`. */
function buildDateFnsLocale(code: string, weekStartsOn: number): Locale {
  const width = (w: string | undefined): "long" | "short" | "narrow" => (w === "wide" ? "long" : w === "narrow" ? "narrow" : "short");
  const intl = (options: Intl.DateTimeFormatOptions, date: Date) => {
    try {
      return new Intl.DateTimeFormat(code, options).format(date);
    }
    catch {
      return new Intl.DateTimeFormat("en-US", options).format(date);
    }
  };

  return {
    ...enUS,
    code,
    localize: {
      ...enUS.localize,
      month: (value: number, options?: { width?: string }) => intl({ month: width(options?.width) }, new Date(2000, value, 1)),
      day: (value: number, options?: { width?: string }) => intl({ weekday: width(options?.width) }, new Date(2000, 0, 2 + value)),
    } as Locale["localize"],
    options: { ...enUS.options, weekStartsOn: Math.min(Math.max(weekStartsOn, 0), 6) as 0 | 1 | 2 | 3 | 4 | 5 | 6 },
  };
}

/**
 * Parse a relative date string offset (e.g. $NOW-30d --> 30)
 *
 * Currently only values with a negative offset ('-') and a unit of days ('d') are supported
 */
function parseRelativeDateOffset(value: string, nowKeyword: string): number {
  const defaultVal = 30;
  if (!value) {
    return defaultVal;
  }

  try {
    if (!value.startsWith(nowKeyword)) {
      return defaultVal;
    }

    const remainder = value.slice(nowKeyword.length);
    if (!remainder.startsWith("-")) {
      throw new Error("Invalid operator (not '-')");
    }

    if (remainder.slice(-1) !== "d") {
      throw new Error("Invalid unit (not 'd')");
    }

    // Slice off sign and unit
    return parseInt(remainder.slice(1, -1));
  }
  catch (error) {
    console.warn(`Unable to parse relative date offset from '${value}': ${error}`);
    return defaultVal;
  }
}

export function QueryFilterBuilder({ fieldDefs, initialQueryFilter = null, onInput, onInputJSON }: QueryFilterBuilderProps) {
  const { t, d, locale } = useI18n();
  const theme = useTheme();
  const display = useDisplay();
  const { household } = useHouseholdSelf();
  const { logOps, placeholderKeywords, getRelOps, buildQueryFilterString, getFieldFromFieldDef, isOrganizerType } = useQueryFilterBuilder();

  const firstDayOfWeek = household?.preferences?.firstDayOfWeek || 0;

  const [fields, setFields] = useState<FieldWithId[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  // the field (by id) whose calendar popover is open, and the input it is anchored to
  const [datePicker, setDatePicker] = useState<{ id: number; anchor: HTMLElement } | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const uid = useRef(1); // init uid to pass to fields

  const dateLocale = buildDateFnsLocale(locale, firstDayOfWeek);

  const categoryStore = useCategoryStore();
  const tagStore = useTagStore();
  const toolStore = useToolStore();
  const foodStore = useFoodStore();
  const labelStore = useLabelStore();
  const householdStore = useHouseholdStore();
  const userStore = useUserStore();

  const storeMap: Record<Organizer, OrganizerStore> = {
    [Organizer.Category]: { store: categoryStore.store, getAll: () => categoryStore.actions.getAll() },
    [Organizer.Tag]: { store: tagStore.store, getAll: () => tagStore.actions.getAll() },
    [Organizer.Tool]: { store: toolStore.store, getAll: () => toolStore.actions.getAll() },
    [Organizer.Food]: { store: foodStore.store, getAll: () => foodStore.actions.getAll() },
    [Organizer.Label]: { store: labelStore.store, getAll: () => labelStore.actions.getAll() },
    [Organizer.Household]: { store: householdStore.store, getAll: () => householdStore.actions.getAll() },
    [Organizer.User]: { store: userStore.store, getAll: () => userStore.actions.getAll() },
  } as unknown as Record<Organizer, OrganizerStore>;

  // ===========================================================================
  // Field editing

  function nextUid() {
    return uid.current++;
  }

  function newField(fieldDef: FieldDefinition): FieldWithId {
    return { ...getFieldFromFieldDef(fieldDef), id: nextUid() };
  }

  function updateField(index: number, patch: Partial<Field>) {
    setFields(prev => prev.map((field, i) => (i === index ? { ...field, ...patch } : field)));
  }

  function addField(fieldDef: FieldDefinition) {
    setFields(prev => [...prev, newField(fieldDef)]);
  }

  function setField(index: number, fieldLabel: string) {
    setDatePicker(null);
    const fieldDef = fieldDefs.find(def => def.label === fieldLabel);
    const current = fields[index];
    if (!fieldDef || !current) {
      return;
    }

    const resetValue = (fieldDef.type !== current.type) || (fieldDef.fieldChoices !== current.fieldChoices);
    const updatedField = { ...current, ...fieldDef };

    // we have to set this explicitly since it might be undefined
    updatedField.fieldChoices = fieldDef.fieldChoices;

    const next: FieldWithId = {
      ...getFieldFromFieldDef(updatedField, resetValue),
      id: current.id, // keep the id
    };

    // Defaults
    switch (next.type) {
      case "date":
        next.value = safeNewDate("");
        break;
      case "relativeDate":
        next.value = "$NOW-30d";
        break;
      case "duration":
        next.value = 30 * 60;
        break;

      default:
        break;
    }

    setFields(prev => prev.map((field, i) => (i === index ? next : field)));
  }

  function setLogicalOperatorValue(index: number, value: LogicalOperator | undefined) {
    const operator = value || logOps.AND.value;
    updateField(index, { logicalOperator: logOps[operator] });
  }

  function setRelationalOperatorValue(index: number, field: FieldWithId, value: RelationalKeyword | RelationalOperator) {
    updateField(index, { relationalOperatorValue: getRelOps(field.type)[value] });
  }

  function setFieldValue(index: number, field: FieldWithId, value: FieldValue | null) {
    setDatePicker(null);

    if (field.type === "relativeDate") {
      // Value is set to an int representing the offset from $NOW
      // Values are assumed to be negative offsets ('-') with a unit of days ('d')
      updateField(index, { value: `$NOW-${Math.abs(Number(value))}d` });
    }
    else {
      updateField(index, { value: value ?? "" });
    }
  }

  function setFieldValues(index: number, values: FieldValue[]) {
    updateField(index, { values });
  }

  function setFieldOrganizers(index: number, organizers: OrganizerBase[]) {
    // Sync the values array with the organizers array
    updateField(index, {
      organizers,
      values: organizers.map(org => org.id?.toString() || "").filter(id => id),
    });
  }

  function removeField(index: number) {
    setFields(prev => prev.filter((_, i) => i !== index));
  }

  // ===========================================================================
  // Drag and drop

  useSortable(listRef, {
    handle: ".handle",
    delay: 250,
    delayOnTouchOnly: true,
    animation: 200,
    group: "recipe-instructions",
    ghostClass: "ghost",
    onReorder: ({ oldIndex, newIndex }) => setFields(prev => moveItem(prev, oldIndex, newIndex)),
    onEnd: () => setDatePicker(null),
  });

  // ===========================================================================
  // Output

  function buildQueryFilterJSON(): QueryFilterJSON {
    const parts = fields.map((field) => {
      const part: QueryFilterJSONPart = {
        attributeName: field.name,
        leftParenthesis: field.leftParenthesis,
        rightParenthesis: field.rightParenthesis,
        logicalOperator: field.logicalOperator?.value,
        relationalOperator: field.relationalOperatorValue?.value,
      };

      if (field.fieldChoices?.length || isOrganizerType(field.type)) {
        part.value = field.values.map(value => value.toString());
      }
      else if (field.type === "boolean") {
        part.value = field.value ? "true" : "false";
      }
      else {
        part.value = (field.value || "").toString();
      }

      return part;
    });

    const qfJSON = { parts } as QueryFilterJSON;
    console.debug(`Built query filter JSON: ${JSON.stringify(qfJSON)}`);
    return qfJSON;
  }

  const fieldsUpdater = useDebouncedCallback(() => {
    // the builder adds the missing logical operators to the fields it is given
    const qf = buildQueryFilterString(fields.map(field => ({ ...field })), showAdvanced);
    if (qf) {
      console.debug(`Set query filter: ${qf}`);
    }

    onInput?.(qf || undefined);
    onInputJSON?.(qf ? buildQueryFilterJSON() : undefined);
  }, 500);

  // like Vue's deep watch on the fields: not on mount, only when they change
  const seenFields = useRef(fields);
  useEffect(() => {
    if (seenFields.current === fields) {
      return;
    }
    seenFields.current = fields;
    fieldsUpdater();
  }, [fields, fieldsUpdater]);

  // ===========================================================================
  // Initialization

  useEffect(() => {
    function initFieldsError(error = "") {
      if (error) {
        console.error(error);
      }

      const first = fieldDefs[0];
      setFields(first ? [newField(first)] : []);
    }

    async function hydrateOrganizers(field: FieldWithId) {
      if (!field.values?.length || !isOrganizerType(field.type)) {
        return;
      }

      const entry = storeMap[field.type];
      let list = entry.store;
      if (!list.length) {
        list = await entry.getAll();
      }

      const organizers = field.values.map((value) => {
        const organizer = list.find(item => item?.id?.toString() === value);
        if (!organizer) {
          console.error(`Could not find organizer with id ${value}`);
          return undefined;
        }
        return organizer;
      });

      field.organizers = organizers.filter(organizer => organizer !== undefined);
    }

    async function initializeFields() {
      if (!initialQueryFilter?.parts?.length) {
        return initFieldsError();
      }

      const initFields: FieldWithId[] = [];
      let advanced = false;

      for (const part of initialQueryFilter.parts) {
        const fieldDef = fieldDefs.find(def => def.name === part.attributeName);
        if (!fieldDef) {
          return initFieldsError(`Invalid query filter; unknown attribute name "${part.attributeName || ""}"`);
        }

        const field = newField(fieldDef);
        const relOps = getRelOps(field.type);

        field.leftParenthesis = part.leftParenthesis || field.leftParenthesis;
        field.rightParenthesis = part.rightParenthesis || field.rightParenthesis;
        field.logicalOperator = part.logicalOperator
          ? logOps[part.logicalOperator]
          : field.logicalOperator;
        field.relationalOperatorValue = part.relationalOperator
          ? relOps[part.relationalOperator]
          : field.relationalOperatorValue;

        if (field.leftParenthesis || field.rightParenthesis) {
          advanced = true;
        }

        if (field.fieldChoices?.length || isOrganizerType(field.type)) {
          if (typeof part.value === "string") {
            field.values = part.value ? [part.value] : [];
          }
          else {
            field.values = part.value || [];
          }

          if (isOrganizerType(field.type)) {
            await hydrateOrganizers(field);
          }
        }
        else if (field.type === "boolean") {
          const boolString = (part.value as string | null | undefined) || "false";
          field.value = (
            boolString[0]!.toLowerCase() === "t"
            || boolString[0]!.toLowerCase() === "y"
            || boolString[0] === "1"
          );
        }
        else if (field.type === "number" || field.type === "duration") {
          field.value = Number(part.value as string || "0");
          if (isNaN(field.value)) {
            return initFieldsError(`Invalid query filter; invalid number value "${(part.value || "").toString()}"`);
          }
        }
        else if (field.type === "date") {
          field.value = part.value as string || "";
          const date = new Date(field.value);
          if (isNaN(date.getTime())) {
            return initFieldsError(`Invalid query filter; invalid date value "${(part.value || "").toString()}"`);
          }
        }
        else {
          field.value = part.value as string || "";
        }

        initFields.push(field);
      }

      if (initFields.length) {
        if (advanced) {
          setShowAdvanced(true);
        }
        setFields(initFields);
      }
      else {
        initFieldsError();
      }
    }

    // only on mount, like Vue's onMounted: the initial filter and the field definitions are read once
    initializeFields().catch((error: unknown) => {
      console.error(`Error initializing fields: ${(error || "").toString()}`);
      const first = fieldDefs[0];
      setFields(first ? [newField(first)] : []);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===========================================================================
  // Layout (Vuetify grid columns per row)

  const adv = showAdvanced;
  const lastIndex = fields.length - 1;
  const config = {
    icon: { cols: () => 2, sm: (): GridSpan => "auto" },
    leftParens: { cols: (index: number) => (adv ? (index === 0 ? 2 : 0) : 0), sm: () => (adv ? 1 : 0) },
    // Fills the space left by the auto-width icon column
    logicalOperator: { cols: () => 0, sm: (): GridSpan => true },
    fieldName: {
      cols: (index: number) => {
        if (adv) return index === 0 ? 8 : 12;
        return index === 0 ? 10 : 12;
      },
      sm: () => (adv ? 2 : 3),
    },
    relationalOperator: { cols: () => 12, sm: () => 2 },
    fieldValue: {
      cols: (index: number) => {
        const last = index === lastIndex;
        if (adv) return last ? 8 : 10;
        return last ? 10 : 12;
      },
      sm: () => (adv ? 3 : 4),
    },
    rightParens: { cols: (index: number) => (adv ? (index === lastIndex ? 2 : 0) : 0), sm: () => (adv ? 1 : 0) },
    fieldActions: { cols: (index: number) => (index === lastIndex ? 2 : 0), sm: () => 1 },
  };

  const bandOpacity = 0.04 * (theme.palette.mode === "dark" ? 2 : 1);
  const nowKeyword = placeholderKeywords.$NOW.value;

  function renderOrganizerSelector(field: FieldWithId, index: number) {
    return (
      <RecipeOrganizerSelector
        selectorType={field.type as RecipeOrganizer}
        value={field.organizers as unknown as RecipeOrganizerItem[]}
        onChange={val => setFieldOrganizers(index, (val || []) as unknown as OrganizerBase[])}
        showAdd={false}
        showLabel={false}
        showIcon={false}
        variant="underlined"
      />
    );
  }

  function renderFieldValue(field: FieldWithId, index: number) {
    if (field.fieldChoices) {
      return (
        <TextField
          select
          fullWidth
          variant="standard"
          value={field.values as Array<string | number>}
          slotProps={{
            select: {
              multiple: true,
              renderValue: (selected) => {
                const chosen = selected as Array<string | number>;
                return field.fieldChoices!
                  .filter(choice => chosen.includes(choice.value as string | number))
                  .map(choice => choice.label)
                  .join(", ");
              },
            },
          }}
          onChange={event => setFieldValues(index, event.target.value as unknown as FieldValue[])}
        >
          {field.fieldChoices.map(choice => (
            <MenuItem key={String(choice.value)} value={choice.value as string | number}>
              {choice.label}
            </MenuItem>
          ))}
        </TextField>
      );
    }

    switch (field.type) {
      case "string":
        return (
          <TextField
            fullWidth
            variant="standard"
            value={(field.value as string | undefined) ?? ""}
            onChange={event => setFieldValue(index, field, event.target.value)}
          />
        );
      case "number":
        return (
          <BaseNumberInput
            fullWidth
            value={(field.value as number) || 0}
            variant="underlined"
            inset
            min={0}
            max={5}
            precision={null}
            onChange={value => setFieldValue(index, field, value)}
          />
        );
      case "boolean":
        return (
          <Checkbox
            checked={!!field.value}
            onChange={event => setFieldValue(index, field, event.target.checked)}
          />
        );
      case "date": {
        const date = safeNewDate(`${field.value}T00:00:00`);
        return (
          <>
            <TextField
              fullWidth
              variant="standard"
              color="primary"
              value={d(date)}
              onClick={event => setDatePicker({ id: field.id, anchor: event.currentTarget })}
              slotProps={{
                input: { readOnly: true, sx: { cursor: "pointer" } },
                htmlInput: { style: { textAlign: "end", paddingRight: 6 } },
              }}
            />
            <Popover
              open={datePicker?.id === field.id}
              anchorEl={datePicker?.id === field.id ? datePicker.anchor : null}
              onClose={() => setDatePicker(null)}
              anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
              slotProps={{ paper: { sx: { maxWidth: 290 } } }}
            >
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={dateLocale}>
                <DateCalendar
                  value={date}
                  onChange={(val: Date | null) => setFieldValue(index, field, val ? format(val, "yyyy-MM-dd") : "")}
                />
              </LocalizationProvider>
            </Popover>
          </>
        );
      }
      case "relativeDate": {
        // Relative dates are assumed to be negative intervals with a unit of days.
        // The input is a *positive*, interpreted internally as a *negative* offset.
        const offset = parseRelativeDateOffset(field.value as string, nowKeyword);
        return (
          <BaseNumberInput
            fullWidth
            value={offset}
            suffix={t("query-filter.dates.days-ago", offset)}
            variant="underlined"
            density="compact"
            inset
            min={0}
            precision={0}
            onChange={value => setFieldValue(index, field, value)}
          />
        );
      }
      case "duration":
        return (
          <Box sx={{ width: "100%" }}>
            <RecipeTimeInput
              seconds={(field.value as number) || null}
              hideText
              onSecondsChange={seconds => setFieldValue(index, field, seconds ?? "")}
            />
          </Box>
        );
      default:
        return isOrganizerType(field.type) ? renderOrganizerSelector(field, index) : null;
    }
  }

  return (
    <Card elevation={0} sx={{ m: 0, background: "transparent" }}>
      <CardContent sx={{ "m": 0, "p": 0, "&:last-child": { pb: 0 } }}>
        <Box ref={listRef} sx={{ "& .ghost": { opacity: 0.4 } }}>
          {fields.map((field, index) => (
            <Grid
              key={field.id}
              container
              spacing={0}
              columnSpacing={2}
              sx={{
                display: "flex",
                flexDirection: "row",
                flexWrap: "wrap",
                mx: "auto",
                pb: 1,
                maxWidth: "100%",
                backgroundColor: display.xs
                  ? (index % 2 === 0 ? `rgba(0, 0, 0, ${bandOpacity})` : `rgba(255, 255, 255, ${bandOpacity})`)
                  : undefined,
              }}
            >
              {/* drag handle */}
              <Col cols={config.icon.cols()} sm={config.icon.sm()} noPadding={display.smAndDown}>
                <MdiIcon className="handle" size={28} sx={{ my: "auto", cursor: "move" }} path={icons.arrowUpDown} />
              </Col>

              {/* and / or */}
              {(index !== 0 || display.smAndUp) && (
                <Col cols={config.logicalOperator.cols()} sm={config.logicalOperator.sm()}>
                  {index !== 0 && (
                    <TextField
                      select
                      fullWidth
                      variant="standard"
                      value={field.logicalOperator?.value ?? ""}
                      sx={{ "& .MuiSelect-select": { textAlign: "center" } }}
                      onChange={event => setLogicalOperatorValue(index, event.target.value as LogicalOperator)}
                    >
                      {[logOps.AND, logOps.OR].map(op => (
                        <MenuItem key={op.value} value={op.value}>{op.label}</MenuItem>
                      ))}
                    </TextField>
                  )}
                </Col>
              )}

              {/* left parenthesis */}
              {showAdvanced && (
                <Col cols={config.leftParens.cols(index)} sm={config.leftParens.sm()}>
                  <TextField
                    select
                    fullWidth
                    variant="standard"
                    value={field.leftParenthesis ?? ""}
                    sx={{ "& .MuiSelect-select": { textAlign: "center" } }}
                    onChange={event => updateField(index, { leftParenthesis: event.target.value })}
                  >
                    {LEFT_PARENS.map(paren => (
                      <MenuItem key={paren} value={paren}>{paren || " "}</MenuItem>
                    ))}
                  </TextField>
                </Col>
              )}

              {/* field name */}
              <Col cols={config.fieldName.cols(index)} sm={config.fieldName.sm()}>
                <TextField
                  select
                  fullWidth
                  variant="standard"
                  value={field.label}
                  sx={{ "& .MuiSelect-select": { textAlign: "center" } }}
                  onChange={event => setField(index, event.target.value)}
                >
                  {fieldDefs.map(def => (
                    <MenuItem key={def.label} value={def.label}>{def.label}</MenuItem>
                  ))}
                </TextField>
              </Col>

              {/* relational operator */}
              <Col cols={config.relationalOperator.cols()} sm={config.relationalOperator.sm()}>
                {field.type !== "boolean" && (
                  <TextField
                    select
                    fullWidth
                    variant="standard"
                    value={field.relationalOperatorValue?.value ?? ""}
                    sx={{ "& .MuiSelect-select": { textAlign: "center" } }}
                    onChange={event => setRelationalOperatorValue(index, field, event.target.value as RelationalKeyword | RelationalOperator)}
                  >
                    {field.relationalOperatorChoices.map(op => (
                      <MenuItem key={op.value} value={op.value}>{op.label}</MenuItem>
                    ))}
                  </TextField>
                )}
              </Col>

              {/* field value */}
              <Col cols={config.fieldValue.cols(index)} sm={config.fieldValue.sm()}>
                {renderFieldValue(field, index)}
              </Col>

              {/* right parenthesis */}
              {showAdvanced && (
                <Col cols={config.rightParens.cols(index)} sm={config.rightParens.sm()}>
                  <TextField
                    select
                    fullWidth
                    variant="standard"
                    value={field.rightParenthesis ?? ""}
                    sx={{ "& .MuiSelect-select": { textAlign: "center" } }}
                    onChange={event => updateField(index, { rightParenthesis: event.target.value })}
                  >
                    {RIGHT_PARENS.map(paren => (
                      <MenuItem key={paren} value={paren}>{paren || " "}</MenuItem>
                    ))}
                  </TextField>
                </Col>
              )}

              {/* field actions */}
              {/* kept on sm rows without a delete button so the columns line up */}
              {(!display.xs || index === lastIndex) && (
                <Col cols={config.fieldActions.cols(index)} sm={config.fieldActions.sm()}>
                  {(!display.smAndDown || index === lastIndex) && (
                    <Box sx={{ my: "auto" }}>
                      <BaseButtonGroup
                        buttons={[
                          {
                            icon: icons.delete,
                            text: t("general.delete"),
                            event: "delete",
                            disabled: fields.length === 1,
                          },
                        ]}
                        onAction={() => removeField(index)}
                      />
                    </Box>
                  )}
                </Col>
              )}
            </Grid>
          ))}
        </Box>
      </CardContent>
      <CardActions sx={{ justifyContent: "flex-end", m: 1, flexWrap: "wrap" }}>
        <FormControlLabel
          sx={{ my: "auto", mr: 2 }}
          label={t("general.show-advanced")}
          control={<Checkbox color="primary" checked={showAdvanced} onChange={event => setShowAdvanced(event.target.checked)} />}
        />
        <BaseButton
          create
          text={t("general.add-field")}
          sx={{ my: "auto" }}
          onClick={() => addField(fieldDefs[0]!)}
        />
      </CardActions>
    </Card>
  );
}
