import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import Box from "@mui/material/Box";
import type { SxProps, Theme } from "@mui/material/styles";
import type { MultiPurposeLabelSummary } from "~/lib/api/types/labels";
import type { IngredientFood, IngredientUnit } from "~/lib/api/types/recipe";
import { icons } from "~/lib/icons";
import { useSearch } from "~/hooks/use-search";
import { BaseButton } from "./BaseButton";
import { AutocompleteInput } from "./form";

type LabelLike = MultiPurposeLabelSummary | IngredientFood | IngredientUnit;

export interface InputLabelTypeProps<T extends LabelLike> {
  value: T | null | undefined;
  onChange?: (value: T | null) => void;
  /** `v-model:item-id` */
  onItemIdChange?: (id: string | null) => void;
  items: T[];
  icon?: string;
  create?: boolean;
  search?: boolean;
  label?: string;
  onCreate?: (value: string) => void;
  sx?: SxProps<Theme>;
  className?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export interface InputLabelTypeHandle {
  focus: () => void;
}

function InputLabelTypeInner<T extends LabelLike>(props: InputLabelTypeProps<T>, ref: React.Ref<InputLabelTypeHandle>) {
  const { value, onChange, onItemIdChange, items, icon, create = false, search = false, label, onCreate, sx, className, autoFocus, disabled, placeholder } = props;
  const inputRef = useRef<HTMLInputElement>(null);
  const { search: searchInput, setSearch, filtered } = useSearch(items);

  useImperativeHandle(ref, () => ({ focus: () => inputRef.current?.focus() }), []);

  const itemVal = useMemo(() => (!value || Object.keys(value).length === 0 ? null : value), [value]);

  function emitCreate() {
    if (items.some(item => item.name === searchInput)) {
      return;
    }
    onCreate?.(searchInput);
    inputRef.current?.blur();
  }

  return (
    <Box sx={sx} className={className}>
      <AutocompleteInput<T>
        value={itemVal}
        onChange={(val: T | null) => {
          onItemIdChange?.(val?.id ?? null);
          onChange?.(val);
        }}
        search={searchInput}
        onSearchChange={setSearch}
        items={filtered}
        itemTitle="name"
        returnObject
        disableFilter
        prependInnerIcon={icon || (search ? icons.search : icons.tags)}
        variant={search ? "solo-filled" : undefined}
        autoSelectFirst
        clearable
        hideDetails
        label={label}
        placeholder={placeholder}
        autoFocus={autoFocus}
        disabled={disabled}
        inputRef={inputRef}
        sx={search ? { "& .MuiOutlinedInput-root": { borderRadius: 6 } } : undefined}
        onKeyDown={(e) => {
          if (e.key === "Enter") emitCreate();
        }}
        appendItem={create
          ? (
              <Box sx={{ px: 1, py: 0.5 }}>
                <BaseButton fullWidth small onClick={emitCreate} />
              </Box>
            )
          : undefined}
      />
    </Box>
  );
}

/** Autocomplete for labels, foods and units with ranked search and an optional "create" action. */
export const InputLabelType = forwardRef(InputLabelTypeInner) as <T extends LabelLike>(
  props: InputLabelTypeProps<T> & { ref?: React.Ref<InputLabelTypeHandle> },
) => ReturnType<typeof InputLabelTypeInner>;

export default InputLabelType;
