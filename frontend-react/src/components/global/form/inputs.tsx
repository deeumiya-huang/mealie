import { useMemo, useState } from "react";
import type { KeyboardEvent, ReactNode, Ref } from "react";
import Autocomplete, { createFilterOptions } from "@mui/material/Autocomplete";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormHelperText from "@mui/material/FormHelperText";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import type { TextFieldProps } from "@mui/material/TextField";
import type { SxProps, Theme } from "@mui/material/styles";
import { icons } from "~/lib/icons";
import { isThemeColor } from "~/theme/theme";
import { Icon } from "../Icon";
import { useFieldRules } from "./validation";
import type { Rule } from "./validation";

type Variant = "outlined" | "filled" | "standard" | "underlined" | "solo" | "solo-filled" | "plain";

function muiVariant(variant: Variant | undefined): TextFieldProps["variant"] {
  if (variant === "filled" || variant === "solo-filled") return "filled";
  if (variant === "underlined" || variant === "plain") return "standard";
  return "outlined";
}

interface CommonFieldProps {
  label?: ReactNode;
  rules?: readonly Rule<never>[];
  hint?: string;
  persistentHint?: boolean;
  hideDetails?: boolean | "auto";
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  variant?: Variant;
  density?: "default" | "comfortable" | "compact";
  prependIcon?: string;
  prependInnerIcon?: string;
  appendInnerIcon?: string;
  onAppendInnerClick?: () => void;
  onPrependInnerClick?: () => void;
  sx?: SxProps<Theme>;
  className?: string;
  autoFocus?: boolean;
  name?: string;
  id?: string;
  required?: boolean;
  fullWidth?: boolean;
  /** Appended adornment content (the Vue `#append-inner` slot). */
  appendInner?: ReactNode;
  prependInner?: ReactNode;
  suffix?: string;
  prefix?: string;
  eagerValidation?: boolean;
}

function helper(hideDetails: boolean | "auto" | undefined, error: boolean, helperText: string | undefined, hint?: string, persistentHint?: boolean): ReactNode {
  if (error) return helperText;
  if (hint && (persistentHint || hideDetails !== true)) return hint;
  if (hideDetails === true || hideDetails === "auto") return undefined;
  return " ";
}

function adornments(props: CommonFieldProps) {
  const start = props.prependInner ?? (props.prependInnerIcon
    ? (
        <InputAdornment position="start">
          {props.onPrependInnerClick
            ? <IconButton size="small" edge="start" onClick={props.onPrependInnerClick}><Icon path={props.prependInnerIcon} /></IconButton>
            : <Icon path={props.prependInnerIcon} />}
        </InputAdornment>
      )
    : props.prefix ? <InputAdornment position="start">{props.prefix}</InputAdornment> : undefined);
  const end = props.appendInner ?? (props.appendInnerIcon
    ? (
        <InputAdornment position="end">
          {props.onAppendInnerClick
            ? <IconButton size="small" edge="end" onClick={props.onAppendInnerClick}><Icon path={props.appendInnerIcon} /></IconButton>
            : <Icon path={props.appendInnerIcon} />}
        </InputAdornment>
      )
    : props.suffix ? <InputAdornment position="end">{props.suffix}</InputAdornment> : undefined);
  return { start, end };
}

function withPrependIcon(prependIcon: string | undefined, field: ReactNode) {
  if (!prependIcon) return field;
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, width: "100%" }}>
      <Icon path={prependIcon} sx={{ mt: 1 }} />
      <div style={{ flex: 1, minWidth: 0 }}>{field}</div>
    </div>
  );
}

export interface TextInputProps extends CommonFieldProps {
  value: string | null | undefined;
  onChange?: (value: string) => void;
  type?: string;
  multiline?: boolean;
  rows?: number;
  maxRows?: number;
  autoGrow?: boolean;
  clearable?: boolean;
  autoComplete?: string;
  onKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  inputRef?: Ref<HTMLInputElement | HTMLTextAreaElement>;
  maxLength?: number;
  counter?: boolean | number;
  inputProps?: Record<string, unknown>;
}

/** `<v-text-field>` / `<v-textarea>` equivalent with Vuetify-style `rules`. */
export function TextInput(props: TextInputProps) {
  const {
    value, onChange, rules, label, type, multiline, rows, maxRows, autoGrow, clearable, hint, persistentHint, hideDetails,
    placeholder, disabled, readOnly, variant, density, sx, className, autoFocus, name, id, required, fullWidth = true,
    autoComplete, onKeyDown, onBlur, onFocus, inputRef, maxLength, counter, inputProps, prependIcon, eagerValidation,
  } = props;
  const { error, helperText, touch, formDisabled } = useFieldRules(value ?? "", rules as Rule<string>[] | undefined, { eager: eagerValidation });
  const { start, end } = adornments(props);
  const clearAdornment = clearable && value
    ? (
        <InputAdornment position="end">
          <IconButton size="small" aria-label="clear" onClick={() => onChange?.("")}>
            <Icon path="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" size="small" />
          </IconButton>
        </InputAdornment>
      )
    : null;
  const counterText = counter && typeof value === "string"
    ? `${value.length}${typeof counter === "number" ? ` / ${counter}` : maxLength ? ` / ${maxLength}` : ""}`
    : undefined;

  const field = (
    <TextField
      label={label}
      value={value ?? ""}
      onChange={e => onChange?.(e.target.value)}
      type={type}
      multiline={multiline}
      rows={multiline && !autoGrow ? rows : undefined}
      minRows={multiline && autoGrow ? rows : undefined}
      maxRows={multiline ? maxRows : undefined}
      error={error}
      helperText={helper(hideDetails, error, helperText, hint, persistentHint) ?? counterText}
      placeholder={placeholder}
      disabled={disabled || formDisabled}
      variant={muiVariant(variant)}
      size={density === "compact" || density === "comfortable" ? "small" : "small"}
      sx={sx}
      className={className}
      autoFocus={autoFocus}
      name={name}
      id={id}
      required={required}
      fullWidth={fullWidth}
      autoComplete={autoComplete}
      onKeyDown={onKeyDown}
      onBlur={() => {
        touch();
        onBlur?.();
      }}
      onFocus={onFocus}
      inputRef={inputRef}
      slotProps={{
        input: {
          readOnly,
          startAdornment: start,
          endAdornment: clearAdornment || end ? <>{clearAdornment}{end}</> : undefined,
        },
        htmlInput: { maxLength, ...inputProps },
      }}
    />
  );
  return withPrependIcon(prependIcon, field);
}

export interface NumberInputProps extends CommonFieldProps {
  value: number | null | undefined;
  onChange?: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  precision?: number | null;
  onBlur?: () => void;
  onKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void;
  controlVariant?: string;
  inputRef?: Ref<HTMLInputElement>;
}

/** `<v-number-input>` equivalent (native number field). */
export function NumberInput(props: NumberInputProps) {
  const {
    value, onChange, rules, label, min, max, step, hint, persistentHint, hideDetails, placeholder, disabled, readOnly, variant, sx, className,
    autoFocus, name, id, fullWidth = true, onBlur, onKeyDown, prependIcon, inputRef, eagerValidation,
  } = props;
  const { error, helperText, touch, formDisabled } = useFieldRules(value ?? null, rules as Rule<number | null>[] | undefined, { eager: eagerValidation });
  const [text, setText] = useState<string>(value === null || value === undefined ? "" : String(value));
  const [lastValue, setLastValue] = useState(value);
  if (!Object.is(lastValue, value)) {
    // Sync from props when the value changes outside this field.
    setLastValue(value);
    if (Number(text) !== value) {
      setText(value === null || value === undefined ? "" : String(value));
    }
  }
  const { start, end } = adornments(props);

  const field = (
    <TextField
      label={label}
      type="number"
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        if (e.target.value === "") {
          onChange?.(null);
          return;
        }
        const n = Number(e.target.value);
        if (!Number.isNaN(n)) onChange?.(n);
      }}
      error={error}
      helperText={helper(hideDetails, error, helperText, hint, persistentHint)}
      placeholder={placeholder}
      disabled={disabled || formDisabled}
      variant={muiVariant(variant)}
      size="small"
      sx={sx}
      className={className}
      autoFocus={autoFocus}
      name={name}
      id={id}
      fullWidth={fullWidth}
      inputRef={inputRef}
      onKeyDown={onKeyDown}
      onBlur={() => {
        touch();
        onBlur?.();
      }}
      slotProps={{
        input: { readOnly, startAdornment: start, endAdornment: end },
        htmlInput: { min, max, step },
      }}
    />
  );
  return withPrependIcon(prependIcon, field);
}

type ItemKey<T> = keyof T | ((item: T) => unknown);

function readKey<T>(item: T, key: ItemKey<T> | undefined, fallback: "title" | "value"): unknown {
  if (item === null || typeof item !== "object") return item;
  if (typeof key === "function") return key(item);
  if (key !== undefined) return (item as Record<PropertyKey, unknown>)[key as PropertyKey];
  const record = item as Record<string, unknown>;
  return fallback in record ? record[fallback] : item;
}

export interface SelectInputProps<T, V = unknown> extends CommonFieldProps {
  items: readonly T[];
  value: V;
  onChange?: (value: V) => void;
  itemTitle?: ItemKey<T>;
  itemValue?: ItemKey<T>;
  returnObject?: boolean;
  multiple?: boolean;
  chips?: boolean;
  clearable?: boolean;
  renderItem?: (item: T) => ReactNode;
  menuMaxHeight?: number;
}

/** `<v-select>` equivalent. Values compare by `itemValue` (or the item itself with `returnObject`). */
export function SelectInput<T, V = unknown>(props: SelectInputProps<T, V>) {
  const {
    items, value, onChange, itemTitle, itemValue, returnObject, multiple, chips, clearable, label, rules, hint, persistentHint,
    hideDetails, disabled, readOnly, variant, sx, className, name, id, fullWidth = true, renderItem, placeholder, prependIcon, eagerValidation,
  } = props;
  const { error, helperText, touch, formDisabled } = useFieldRules(value, rules as Rule<V>[] | undefined, { eager: eagerValidation });
  const valueOf = (item: T) => (returnObject ? item : readKey(item, itemValue, "value"));
  const titleOf = (item: T) => String(readKey(item, itemTitle, "title") ?? "");
  const keyOf = (v: unknown) => (returnObject && v && typeof v === "object" ? readKey(v as T, itemValue, "value") : v);
  const indexOfValue = (v: unknown) => items.findIndex(item => Object.is(keyOf(valueOf(item)), keyOf(v)));

  const selected: string | string[] = multiple
    ? ((value as unknown as unknown[] | null) ?? []).map(v => String(indexOfValue(v))).filter(i => i !== "-1")
    : (() => {
        const i = indexOfValue(value);
        return i === -1 ? "" : String(i);
      })();

  const { start, end } = adornments(props);
  const field = (
    <TextField
      select
      label={label}
      value={selected}
      onChange={(e) => {
        const raw = e.target.value as unknown as string | string[];
        if (multiple) {
          const indexes = (Array.isArray(raw) ? raw : raw.split(",")).map(Number);
          onChange?.(indexes.map(i => valueOf(items[i]!)) as unknown as V);
        }
        else {
          onChange?.((raw === "" ? null : valueOf(items[Number(raw)]!)) as V);
        }
      }}
      onBlur={touch}
      error={error}
      helperText={helper(hideDetails, error, helperText, hint, persistentHint)}
      disabled={disabled || formDisabled}
      variant={muiVariant(variant)}
      size="small"
      sx={sx}
      className={className}
      name={name}
      id={id}
      fullWidth={fullWidth}
      placeholder={placeholder}
      slotProps={{
        input: { readOnly, startAdornment: start, endAdornment: end },
        select: {
          multiple,
          displayEmpty: !!placeholder,
          renderValue: (selectedValue: unknown) => {
            const list = Array.isArray(selectedValue) ? selectedValue as string[] : selectedValue === "" ? [] : [selectedValue as string];
            if (!list.length) return placeholder ?? "";
            if (chips || multiple) {
              return (
                <span style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {list.map(i => chips
                    ? <Chip key={i} size="small" label={titleOf(items[Number(i)]!)} />
                    : <span key={i}>{titleOf(items[Number(i)]!)}</span>)}
                </span>
              );
            }
            return titleOf(items[Number(list[0])]!);
          },
        },
      }}
    >
      {clearable && !multiple && <MenuItem value=""><em>—</em></MenuItem>}
      {items.map((item, i) => (
        <MenuItem key={i} value={String(i)}>
          {multiple && <Checkbox size="small" checked={(selected as string[]).includes(String(i))} sx={{ p: 0.5, mr: 1 }} />}
          {renderItem ? renderItem(item) : titleOf(item)}
        </MenuItem>
      ))}
    </TextField>
  );
  return withPrependIcon(prependIcon, field);
}

export interface AutocompleteInputProps<T> extends CommonFieldProps {
  items: readonly T[];
  /** Single: T | null (returnObject) or a key. Multiple: an array of the same. */
  value: unknown;
  onChange?: (value: never) => void;
  itemTitle?: ItemKey<T>;
  itemValue?: ItemKey<T>;
  returnObject?: boolean;
  multiple?: boolean;
  chips?: boolean;
  closableChips?: boolean;
  clearable?: boolean;
  loading?: boolean;
  noDataText?: string;
  /** Free text entry (`<v-combobox>`). New entries are passed through `onCreate` or as strings. */
  freeSolo?: boolean;
  search?: string;
  onSearchChange?: (search: string) => void;
  customFilter?: (itemTitle: string, query: string, item: T) => boolean;
  renderItem?: (item: T) => ReactNode;
  renderChip?: (item: T, onDelete?: () => void) => ReactNode;
  autoSelectFirst?: boolean;
  hideNoData?: boolean;
  disableFilter?: boolean;
  onKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void;
  onBlur?: () => void;
  inputRef?: Ref<HTMLInputElement>;
  /** Keep the menu open after selecting (`closeOnContentClick=false`). */
  disableCloseOnSelect?: boolean;
}

/**
 * `<v-autocomplete>` / `<v-combobox>` equivalent. The `value` has the same shape the Vue component's
 * v-model had (keys by default, whole objects with `returnObject`).
 */
export function AutocompleteInput<T>(props: AutocompleteInputProps<T>) {
  const {
    items, value, onChange, itemTitle, itemValue, returnObject, multiple, chips, closableChips, clearable = false, loading, noDataText,
    freeSolo, search, onSearchChange, customFilter, renderItem, renderChip, autoSelectFirst, hideNoData, disableFilter, label, rules,
    hint, persistentHint, hideDetails, disabled, readOnly, variant, sx, className, placeholder, onKeyDown, onBlur, inputRef, autoFocus,
    name, id, disableCloseOnSelect, prependIcon, eagerValidation,
  } = props;
  const { error, helperText, touch, formDisabled } = useFieldRules(value as never, rules as Rule<never>[] | undefined, { eager: eagerValidation });
  const titleOf = (item: T | string) => (typeof item === "string" && !items.includes(item as T) ? item : String(readKey(item as T, itemTitle, "title") ?? ""));
  const keyOf = (item: T) => readKey(item, itemValue, "value");

  const toOption = (v: unknown): T | string | null => {
    if (v === null || v === undefined) return null;
    if (returnObject) return v as T;
    const found = items.find(item => Object.is(keyOf(item), v));
    return found ?? (freeSolo && typeof v === "string" ? v : null);
  };
  const fromOption = (o: T | string | null): unknown => {
    if (o === null) return null;
    if (typeof o === "string" && freeSolo && !items.includes(o as T)) return o;
    return returnObject ? o : keyOf(o as T);
  };

  const current = multiple
    ? ((value as unknown[] | null) ?? []).map(toOption).filter((o): o is T | string => o !== null)
    : toOption(value);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- titleOf only depends on itemTitle
  const defaultFilter = useMemo(() => createFilterOptions<T | string>({ stringify: o => titleOf(o) }), [

    itemTitle,
  ]);

  const { start } = adornments(props);

  const field = (
    <Autocomplete<T | string, boolean, boolean, boolean>
      options={items as (T | string)[]}
      multiple={multiple}
      freeSolo={freeSolo}
      value={current as never}
      onChange={(_e, next) => {
        const mapped = multiple
          ? ((next as (T | string)[]) ?? []).map(fromOption)
          : fromOption(next as T | string | null);
        onChange?.(mapped as never);
      }}
      inputValue={search}
      onInputChange={onSearchChange ? (_e, v, reason) => {
        if (reason !== "reset" || !multiple) onSearchChange(v);
      } : undefined}
      getOptionLabel={o => titleOf(o)}
      isOptionEqualToValue={(a, b) => (typeof a === "string" || typeof b === "string")
        ? a === b
        : Object.is(keyOf(a as T), keyOf(b as T))}
      filterOptions={disableFilter
        ? x => x
        : customFilter
          ? (opts, state) => opts.filter(o => customFilter(titleOf(o), state.inputValue, o as T))
          : defaultFilter}
      loading={loading}
      noOptionsText={hideNoData ? undefined : noDataText}
      disableClearable={!clearable as boolean}
      disabled={disabled || formDisabled}
      readOnly={readOnly}
      autoHighlight={autoSelectFirst}
      disableCloseOnSelect={disableCloseOnSelect ?? multiple}
      className={className}
      sx={sx}
      size="small"
      fullWidth
      onKeyDown={onKeyDown}
      onBlur={() => {
        touch();
        onBlur?.();
      }}
      renderOption={({ key, ...optionProps }, option) => (
        <li key={key} {...optionProps}>
          {renderItem && typeof option !== "string" ? renderItem(option) : titleOf(option)}
        </li>
      )}
      renderValue={multiple
        ? (selected, getItemProps) => (selected as (T | string)[]).map((option, index) => {
            const { onDelete, ...itemProps } = getItemProps({ index });
            const key = index;
            if (renderChip && typeof option !== "string") {
              return <span key={key}>{renderChip(option, closableChips ? () => onDelete(undefined) : undefined)}</span>;
            }
            return chips || closableChips
              ? <Chip key={key} size="small" label={titleOf(option)} {...itemProps} onDelete={closableChips ? onDelete : undefined} />
              : <span key={key} style={{ marginInlineEnd: 4 }}>{titleOf(option)}{index < (selected as unknown[]).length - 1 ? "," : ""}</span>;
          })
        : undefined}
      renderInput={params => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          error={error}
          helperText={helper(hideDetails, error, helperText, hint, persistentHint)}
          variant={muiVariant(variant)}
          inputRef={inputRef}
          autoFocus={autoFocus}
          name={name}
          id={id}
          slotProps={{
            ...params.slotProps,
            input: {
              ...params.slotProps.input,
              startAdornment: start
                ? <>{start}{params.slotProps.input.startAdornment}</>
                : params.slotProps.input.startAdornment,
            },
          }}
        />
      )}
    />
  );
  return withPrependIcon(prependIcon, field);
}

interface ToggleInputProps {
  label?: ReactNode;
  checked: boolean | null | undefined;
  onChange?: (checked: boolean) => void;
  color?: string;
  disabled?: boolean;
  readOnly?: boolean;
  hideDetails?: boolean | "auto";
  hint?: string;
  persistentHint?: boolean;
  density?: "default" | "comfortable" | "compact";
  sx?: SxProps<Theme>;
  className?: string;
  rules?: readonly Rule<boolean>[];
  name?: string;
  indeterminate?: boolean;
}

function ToggleInput({ kind, label, checked, onChange, color = "primary", disabled, readOnly, hideDetails, hint, persistentHint, sx, className, rules, name, density, indeterminate }: ToggleInputProps & { kind: "checkbox" | "switch" }) {
  const { error, helperText, formDisabled } = useFieldRules(!!checked, rules);
  const muiColor = isThemeColor(color) ? color : "primary";
  const control = kind === "checkbox"
    ? <Checkbox name={name} color={muiColor} checked={!!checked} indeterminate={indeterminate} size={density === "compact" ? "small" : "medium"} onChange={e => !readOnly && onChange?.(e.target.checked)} />
    : <Switch name={name} color={muiColor} checked={!!checked} size={density === "compact" ? "small" : "medium"} onChange={e => !readOnly && onChange?.(e.target.checked)} />;
  const help = helper(hideDetails, error, helperText, hint, persistentHint);
  return (
    <div className={className}>
      {label !== undefined
        ? <FormControlLabel control={control} label={label} disabled={disabled || formDisabled} sx={sx} />
        : control}
      {help && help !== " " && <FormHelperText error={error} sx={{ mt: -0.5, ml: 4 }}>{help}</FormHelperText>}
    </div>
  );
}

/** `<v-checkbox>` equivalent. */
export function CheckboxInput(props: ToggleInputProps) {
  return <ToggleInput kind="checkbox" {...props} />;
}

/** `<v-switch>` equivalent. */
export function SwitchInput(props: ToggleInputProps) {
  return <ToggleInput kind="switch" {...props} />;
}

export interface FileInputProps extends CommonFieldProps {
  value: File | null;
  onChange?: (value: File | null) => void;
  accept?: string;
  clearable?: boolean;
}

/** `<v-file-input>` equivalent: a read-only field showing the chosen file that opens the picker on click. */
export function FileInput(props: FileInputProps) {
  const { value, onChange, accept, clearable, label, hint, persistentHint, hideDetails, disabled, variant, sx, className, fullWidth = true, prependIcon } = props;
  const [input, setInput] = useState<HTMLInputElement | null>(null);
  const { start } = adornments(props);
  const end = clearable && value
    ? (
        <InputAdornment position="end">
          <IconButton
            size="small"
            edge="end"
            onClick={(e) => {
              e.stopPropagation();
              if (input) input.value = "";
              onChange?.(null);
            }}
          >
            <Icon path={icons.close} />
          </IconButton>
        </InputAdornment>
      )
    : undefined;
  const field = (
    <>
      <TextField
        label={label}
        value={value?.name ?? ""}
        helperText={helper(hideDetails, false, undefined, hint, persistentHint)}
        disabled={disabled}
        variant={muiVariant(variant)}
        size="small"
        sx={sx}
        className={className}
        fullWidth={fullWidth}
        onClick={() => input?.click()}
        slotProps={{ input: { readOnly: true, startAdornment: start, endAdornment: end, sx: { cursor: "pointer" } } }}
      />
      <input
        ref={setInput}
        type="file"
        accept={accept}
        style={{ display: "none" }}
        onChange={e => onChange?.(e.target.files?.[0] ?? null)}
      />
    </>
  );
  return withPrependIcon(prependIcon, field);
}
