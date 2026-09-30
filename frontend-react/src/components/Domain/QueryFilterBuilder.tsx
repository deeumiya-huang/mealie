import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid";
import type { GridSize } from "@mui/material/Grid";
import Popover from "@mui/material/Popover";
import { alpha } from "@mui/material/styles";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import { BaseButton } from "~/components/global/BaseButton";
import { BaseButtonGroup } from "~/components/global/BaseButtonGroup";
import { Icon } from "~/components/global/Icon";
import { SortableList } from "~/components/global/SortableList";
import { NumberInput, SelectInput, TextInput } from "~/components/global/form";
import { RecipeOrganizerSelector } from "~/components/Domain/Recipe/RecipeOrganizerSelector";
import { RecipeTimeInput } from "~/components/Domain/Recipe/RecipeTimeInput";
import { useCategoryStore, useFoodStore, useHouseholdStore, useLabelStore, useTagStore, useToolStore, useUserStore } from "~/hooks/store";
import { useDisplay } from "~/hooks/use-display";
import { useI18n } from "~/hooks/use-global-i18n";
import { useQueryFilterBuilder } from "~/hooks/use-query-filter-builder";
import type { Field, FieldDefinition, FieldValue, OrganizerBase } from "~/hooks/use-query-filter-builder";
import { icons } from "~/lib/icons";
import { Organizer } from "~/lib/api/types/non-generated";
import type {
  LogicalOperator,
  QueryFilterJSON,
  QueryFilterJSONPart,
  RelationalKeyword,
  RelationalOperator,
} from "~/lib/api/types/non-generated";

export interface QueryFilterBuilderProps {
  fieldDefs: FieldDefinition[];
  initialQueryFilter?: QueryFilterJSON | null;
  onInput?: (value: string | undefined) => void;
  onInputJSON?: (value: QueryFilterJSON | undefined) => void;
}

// add id to fields to prevent reactivity issues
type FieldWithId = Field & { id: number };

function safeNewDate(input: string): Date {
  const date = new Date(input);
  if (isNaN(date.getTime())) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }
  return date;
}

const todayString = () => format(safeNewDate(""), "yyyy-MM-dd");

/** Vuetify `cols`/`sm` values → MUI Grid sizes (0/true fill the remaining space like `.v-col`). */
function gridSize(value: number | string | boolean): GridSize {
  if (value === true || value === 0) return "grow";
  if (value === "auto") return "auto";
  return value as number;
}

export function QueryFilterBuilder({ fieldDefs, initialQueryFilter = null, onInput, onInputJSON }: QueryFilterBuilderProps) {
  const i18n = useI18n();
  const display = useDisplay();
  const { logOps, placeholderKeywords, getRelOps, buildQueryFilterString, getFieldFromFieldDef, isOrganizerType } = useQueryFilterBuilder();

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [datePicker, setDatePicker] = useState<{ id: number; anchor: HTMLElement } | null>(null);
  const [fields, setFields] = useState<FieldWithId[]>([]);

  const storeMap = {
    [Organizer.Category]: useCategoryStore(),
    [Organizer.Tag]: useTagStore(),
    [Organizer.Tool]: useToolStore(),
    [Organizer.Food]: useFoodStore(),
    [Organizer.Label]: useLabelStore(),
    [Organizer.Household]: useHouseholdStore(),
    [Organizer.User]: useUserStore(),
  };
  const storeMapRef = useRef(storeMap);
  storeMapRef.current = storeMap;

  const uid = useRef(1); // init uid to pass to fields
  const nextUid = () => uid.current++;

  function updateField(index: number, update: (field: FieldWithId) => FieldWithId) {
    setFields(prev => prev.map((field, i) => (i === index ? update(field) : field)));
  }

  function addField(field: FieldDefinition) {
    setFields(prev => [...prev, { ...getFieldFromFieldDef(field), id: nextUid() }]);
  }

  function setField(index: number, fieldLabel: string) {
    setDatePicker(null);
    const fieldDef = fieldDefs.find(fieldDef => fieldDef.label === fieldLabel);
    if (!fieldDef) {
      return;
    }

    updateField(index, (current) => {
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
          // The Vue app stored a Date object here, which only became a valid filter after picking a date
          next.value = todayString();
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
      return next;
    });
  }

  function setLogicalOperatorValue(index: number, value: LogicalOperator | undefined) {
    const op = value || logOps.AND.value;
    updateField(index, field => ({ ...field, logicalOperator: logOps[op] }));
  }

  function setRelationalOperatorValue(field: FieldWithId, index: number, value: RelationalKeyword | RelationalOperator) {
    const relOps = getRelOps(field.type);
    updateField(index, f => ({ ...f, relationalOperatorValue: relOps[value] }));
  }

  function setFieldValue(field: FieldWithId, index: number, value: FieldValue) {
    setDatePicker(null);
    if (field.type === "relativeDate") {
      // Value is set to an int representing the offset from $NOW
      // Values are assumed to be negative offsets ('-') with a unit of days ('d')
      updateField(index, f => ({ ...f, value: `$NOW-${Math.abs(value as number)}d` }));
    }
    else {
      updateField(index, f => ({ ...f, value }));
    }
  }

  function setFieldOrganizers(index: number, organizers: OrganizerBase[]) {
    updateField(index, f => ({
      ...f,
      organizers,
      // Sync the values array with the organizers array
      values: organizers.map(org => org.id?.toString() || "").filter(id => id),
    }));
  }

  function removeField(index: number) {
    setFields(prev => prev.filter((_, i) => i !== index));
  }

  function buildQueryFilterJSON(current: FieldWithId[]): QueryFilterJSON {
    const parts = current.map((field) => {
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

  // Debounced emit whenever the fields change (the Vue deep watcher)
  const emitRef = useRef({ onInput, onInputJSON });
  emitRef.current = { onInput, onInputJSON };
  const initialized = useRef(false);
  useEffect(() => {
    if (!initialized.current) {
      return;
    }
    const timer = setTimeout(() => {
      // buildQueryFilterString fills in missing logical operators; work on copies
      const qf = buildQueryFilterString(fields.map(f => ({ ...f })), showAdvanced);
      if (qf) {
        console.debug(`Set query filter: ${qf}`);
      }
      emitRef.current.onInput?.(qf || undefined);
      emitRef.current.onInputJSON?.(qf ? buildQueryFilterJSON(fields) : undefined);
    }, 500);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- builder helpers are stable per locale
  }, [fields, showAdvanced]);

  // ================================================================
  // Initialization

  useEffect(() => {
    let active = true;

    async function hydrateOrganizers(field: FieldWithId) {
      if (!field.values?.length || !isOrganizerType(field.type)) {
        return;
      }

      const { actions } = storeMapRef.current[field.type as keyof typeof storeMap];
      if (!actions.getItems().length) {
        await actions.refresh();
      }
      const items = actions.getItems() as OrganizerBase[];

      const organizers = field.values.map((value) => {
        const organizer = items.find(item => item?.id?.toString() === value);
        if (!organizer) {
          console.error(`Could not find organizer with id ${value}`);
          return undefined;
        }
        return organizer;
      });

      field.organizers = organizers.filter(organizer => organizer !== undefined);
    }

    function initFieldsError(error = ""): FieldWithId[] {
      if (error) {
        console.error(error);
      }
      return fieldDefs.length ? [{ ...getFieldFromFieldDef(fieldDefs[0]!), id: nextUid() }] : [];
    }

    async function initializeFields(): Promise<FieldWithId[]> {
      if (!initialQueryFilter?.parts?.length) {
        return initFieldsError();
      }

      const initFields: FieldWithId[] = [];

      for (const part of initialQueryFilter.parts) {
        const fieldDef = fieldDefs.find(fieldDef => fieldDef.name === part.attributeName);
        if (!fieldDef) {
          return initFieldsError(`Invalid query filter; unknown attribute name "${part.attributeName || ""}"`);
        }

        const field: FieldWithId = {
          ...getFieldFromFieldDef(fieldDef),
          id: nextUid(),
        };

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
          setShowAdvanced(true);
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
          const boolString = (part.value as string) || "false";
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

      return initFields.length ? initFields : initFieldsError();
    }

    void (async () => {
      let result: FieldWithId[];
      try {
        result = await initializeFields();
      }
      catch (error) {
        result = initFieldsError(`Error initializing fields: ${String(error || "")}`);
      }
      if (active) {
        initialized.current = true;
        setFields(result);
      }
    })();

    return () => {
      active = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once on mount, like onMounted
  }, []);

  /**
   * Parse a relative date string offset (e.g. $NOW-30d --> 30)
   *
   * Currently only values with a negative offset ('-') and a unit of days ('d') are supported
   */
  function parseRelativeDateOffset(value: string): number {
    const defaultVal = 30;
    if (!value) {
      return defaultVal;
    }

    try {
      if (!value.startsWith(placeholderKeywords["$NOW"].value)) {
        return defaultVal;
      }

      const remainder = value.slice(placeholderKeywords["$NOW"].value.length);
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
      console.warn(`Unable to parse relative date offset from '${value}': ${String(error)}`);
      return defaultVal;
    }
  }

  // ================================================================
  // Layout (Vuetify cols per breakpoint)

  const adv = showAdvanced;
  const last = fields.length - 1;
  const config = {
    icon: { cols: 2, sm: "auto" },
    leftParens: { cols: (index: number) => (adv ? (index === 0 ? 2 : 0) : 0), sm: adv ? 1 : 0 },
    // Fills the space left by the auto-width icon column
    logicalOperator: { cols: 0, sm: true },
    fieldName: {
      cols: (index: number) => (adv ? (index === 0 ? 8 : 12) : (index === 0 ? 10 : 12)),
      sm: adv ? 2 : 3,
    },
    relationalOperator: { cols: 12, sm: 2 },
    fieldValue: {
      cols: (index: number) => (adv ? (index === last ? 8 : 10) : (index === last ? 10 : 12)),
      sm: adv ? 3 : 4,
    },
    rightParens: { cols: (index: number) => (adv ? (index === last ? 2 : 0) : 0), sm: adv ? 1 : 0 },
    fieldActions: { cols: (index: number) => (index === last ? 2 : 0), sm: 1 },
  };
  const colSx = { display: "flex", justifyContent: "center", alignItems: "flex-end", py: 0 };
  const size = (cols: number | string | boolean, sm: number | string | boolean) => ({ xs: gridSize(cols), sm: gridSize(sm) });

  function renderValueInput(field: FieldWithId, index: number) {
    if (field.fieldChoices) {
      return (
        <SelectInput
          value={field.values}
          items={field.fieldChoices}
          itemTitle="label"
          itemValue="value"
          multiple
          variant="underlined"
          onChange={values => updateField(index, f => ({ ...f, values: values as FieldValue[] }))}
        />
      );
    }
    if (field.type === "string") {
      return <TextInput value={field.value as string} variant="underlined" onChange={v => setFieldValue(field, index, v)} />;
    }
    if (field.type === "number") {
      return (
        <NumberInput
          value={field.value as number || 0}
          variant="underlined"
          min={0}
          max={5}
          onChange={v => setFieldValue(field, index, v ?? 0)}
        />
      );
    }
    if (field.type === "boolean") {
      return <Checkbox checked={!!field.value} onChange={e => setFieldValue(field, index, e.target.checked)} />;
    }
    if (field.type === "date") {
      const date = safeNewDate(field.value + "T00:00:00");
      return (
        <>
          <Box sx={{ width: "100%" }} onClick={e => setDatePicker({ id: field.id, anchor: e.currentTarget })}>
            <TextInput
              value={i18n.d(date)}
              variant="underlined"
              readOnly
              sx={{ "& input": { textAlign: "end", pr: "6px" } }}
            />
          </Box>
          <Popover
            open={datePicker?.id === field.id}
            anchorEl={datePicker?.id === field.id ? datePicker.anchor : null}
            onClose={() => setDatePicker(null)}
          >
            <DateCalendar
              value={date}
              onChange={(val: Date | null) => setFieldValue(field, index, val ? format(val, "yyyy-MM-dd") : "")}
            />
          </Popover>
        </>
      );
    }
    if (field.type === "relativeDate") {
      // Relative dates are assumed to be negative intervals with a unit of days.
      // The input is a *positive*, interpreted internally as a *negative* offset.
      const offset = parseRelativeDateOffset(field.value as string);
      return (
        <NumberInput
          value={offset}
          suffix={i18n.t("query-filter.dates.days-ago", offset)}
          variant="underlined"
          density="compact"
          min={0}
          step={1}
          sx={{ "& input": { textAlign: "end", pr: "6px" } }}
          onChange={v => setFieldValue(field, index, Math.round(v ?? 0))}
        />
      );
    }
    if (field.type === "duration") {
      return (
        <Box sx={{ width: "100%" }}>
          <RecipeTimeInput
            seconds={field.value as number || null}
            hideText
            onSecondsChange={s => setFieldValue(field, index, s ?? "")}
          />
        </Box>
      );
    }
    if (isOrganizerType(field.type)) {
      return (
        <Box sx={{ width: "100%" }}>
          <RecipeOrganizerSelector<OrganizerBase>
            key={field.type}
            value={field.organizers}
            selectorType={field.type}
            showAdd={false}
            showLabel={false}
            showIcon={false}
            variant="underlined"
            onChange={val => setFieldOrganizers(index, val || [])}
          />
        </Box>
      );
    }
    return null;
  }

  return (
    <Box>
      <SortableList
        items={fields}
        getId={field => String(field.id)}
        onReorder={(items) => {
          setDatePicker(null);
          setFields(items);
        }}
        renderItem={(field, index, handle) => (
          <Grid
            container
            columnSpacing={1.5}
            sx={{
              flexWrap: "wrap",
              mx: "auto",
              pb: 1,
              maxWidth: "100%",
              ...(display.xs
                ? { bgcolor: theme => index % 2 === 0 ? alpha(theme.palette.common.black, 0.04) : alpha(theme.palette.common.white, 0.04) }
                : {}),
            }}
          >
            {/* drag handle */}
            <Grid size={size(config.icon.cols, config.icon.sm)} sx={{ display: "flex", ...(display.smAndDown ? { p: 0 } : {}) }}>
              <Box
                ref={handle.ref}
                {...handle.attributes}
                {...handle.listeners}
                sx={{ my: "auto", cursor: "move", display: "flex", touchAction: "none" }}
              >
                <Icon path={icons.arrowUpDown} size={28} />
              </Box>
            </Grid>

            {/* and / or */}
            {(index !== 0 || display.smAndUp) && (
              <Grid size={size(config.logicalOperator.cols, config.logicalOperator.sm)} sx={colSx}>
                {index > 0 && (
                  <SelectInput
                    value={field.logicalOperator?.value}
                    items={[logOps.AND, logOps.OR]}
                    itemTitle="label"
                    itemValue="value"
                    variant="underlined"
                    sx={{ "& .MuiSelect-select": { textAlign: "center" } }}
                    onChange={v => setLogicalOperatorValue(index, v as LogicalOperator | undefined)}
                  />
                )}
              </Grid>
            )}

            {/* left parenthesis */}
            {showAdvanced && (
              <Grid size={size(config.leftParens.cols(index), config.leftParens.sm)} sx={colSx}>
                <SelectInput
                  value={field.leftParenthesis ?? ""}
                  items={["", "(", "((", "((("]}
                  variant="underlined"
                  onChange={v => updateField(index, f => ({ ...f, leftParenthesis: v as string }))}
                />
              </Grid>
            )}

            {/* field name */}
            <Grid size={size(config.fieldName.cols(index), config.fieldName.sm)} sx={colSx}>
              <SelectInput
                value={field.label}
                items={fieldDefs}
                itemTitle="label"
                itemValue="label"
                variant="underlined"
                onChange={v => setField(index, v as string)}
              />
            </Grid>

            {/* relational operator */}
            <Grid size={size(config.relationalOperator.cols, config.relationalOperator.sm)} sx={colSx}>
              {field.type !== "boolean" && (
                <SelectInput
                  value={field.relationalOperatorValue?.value}
                  items={field.relationalOperatorChoices}
                  itemTitle="label"
                  itemValue="value"
                  variant="underlined"
                  onChange={v => setRelationalOperatorValue(field, index, v as RelationalKeyword | RelationalOperator)}
                />
              )}
            </Grid>

            {/* field value */}
            <Grid size={size(config.fieldValue.cols(index), config.fieldValue.sm)} sx={colSx}>
              {renderValueInput(field, index)}
            </Grid>

            {/* right parenthesis */}
            {showAdvanced && (
              <Grid size={size(config.rightParens.cols(index), config.rightParens.sm)} sx={colSx}>
                <SelectInput
                  value={field.rightParenthesis ?? ""}
                  items={["", ")", "))", ")))"]}
                  variant="underlined"
                  onChange={v => updateField(index, f => ({ ...f, rightParenthesis: v as string }))}
                />
              </Grid>
            )}

            {/* field actions; kept on sm rows without a delete button so the columns line up */}
            {(!display.xs || index === last) && (
              <Grid size={size(config.fieldActions.cols(index), config.fieldActions.sm)} sx={{ ...colSx, alignItems: "center" }}>
                {(!display.smAndDown || index === last) && (
                  <BaseButtonGroup
                    buttons={[{ icon: icons.delete, text: i18n.t("general.delete"), event: "delete", disabled: fields.length === 1 }]}
                    onEvent={() => removeField(index)}
                  />
                )}
              </Grid>
            )}
          </Grid>
        )}
      />
      <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", m: 2 }}>
        <FormControlLabel
          sx={{ mr: 2 }}
          control={<Checkbox checked={showAdvanced} onChange={e => setShowAdvanced(e.target.checked)} />}
          label={i18n.t("general.show-advanced")}
        />
        <BaseButton create text={i18n.t("general.add-field")} onClick={() => addField(fieldDefs[0]!)} />
      </Box>
    </Box>
  );
}

export default QueryFilterBuilder;
