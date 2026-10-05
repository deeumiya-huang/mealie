// Usage: <InputLabelType items={foods} value={food} onChange={setFood} itemId={id} onItemIdChange={setId}
//          label={t("shopping-list.food")} icon={icons.foods} create onCreate={name => …} ref={handleRef} />
// Autocomplete for labels / foods / units: options are ranked by the typed text (use-item-search), `create` adds a
// "create" button under the list, `search` renders the rounded search-bar variant. `ref` exposes `focus()`.
// Vue `v-model` → `value`/`onChange`, `v-model:item-id` → `itemId`/`onItemIdChange`, `$attrs` → `label`,
// `autoFocus`, `onFocus`, `menuLocation` (Vuetify `menu-props.location`), `sx`.
import { createContext, useContext, useImperativeHandle, useRef, type HTMLAttributes, type Ref, type RefObject } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import InputAdornment from "@mui/material/InputAdornment";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import type { SxProps, Theme } from "@mui/material/styles";
import type { MultiPurposeLabelSummary } from "@/lib/api/types/labels";
import type { IngredientFood, IngredientUnit } from "@/lib/api/types/recipe";
import { icons } from "@/lib/icons";
import { BaseButton } from "./BaseButton";
import { MdiIcon } from "./MdiIcon";
import { useSearch, type ISearchableItem } from "./use-item-search";

type LabelItem = MultiPurposeLabelSummary | IngredientFood | IngredientUnit;

export interface InputLabelTypeHandle {
  focus: () => void;
}

interface InputLabelTypeProps {
  items: LabelItem[];
  value?: LabelItem | null;
  onChange?: (value: LabelItem | null) => void;
  itemId?: string | null;
  onItemIdChange?: (id: string | null) => void;
  icon?: string;
  create?: boolean;
  search?: boolean;
  label?: string;
  autoFocus?: boolean;
  onFocus?: () => void;
  menuLocation?: "top" | "bottom";
  onCreate?: (value: string) => void;
  sx?: SxProps<Theme>;
  ref?: Ref<InputLabelTypeHandle>;
}

// The "create" button below the options (Vue `#append-item` slot); the handler comes through context because
// MUI instantiates the Paper component itself.
const CreateContext = createContext<(() => void) | null>(null);

function OptionsPaper({ children, ...props }: HTMLAttributes<HTMLElement>) {
  const emitCreate = useContext(CreateContext);
  return (
    <Paper {...props}>
      {children}
      {emitCreate && (
        <Box sx={{ px: 1, pb: 1 }}>
          <BaseButton fullWidth small onMouseDown={event => event.preventDefault()} onClick={emitCreate} />
        </Box>
      )}
    </Paper>
  );
}

function mergeRefs<T>(...refs: (Ref<T> | undefined)[]) {
  return (element: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(element);
      else if (ref) (ref as RefObject<T | null>).current = element;
    }
  };
}

export function InputLabelType({
  items,
  value = null,
  onChange,
  onItemIdChange,
  icon,
  create = false,
  search = false,
  label,
  autoFocus = false,
  onFocus,
  menuLocation,
  onCreate,
  sx,
  ref,
}: InputLabelTypeProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const { search: searchInput, setSearch: setSearchInput, filtered: filteredItems } = useSearch<ISearchableItem & LabelItem>(items);

  useImperativeHandle(ref, () => ({ focus: () => inputRef.current?.focus() }), []);

  const itemVal = !value || Object.keys(value).length === 0 ? null : value;

  function emitCreate() {
    if (items.some(item => item.name === searchInput)) {
      return;
    }
    onCreate?.(searchInput);
    inputRef.current?.blur();
  }

  return (
    <CreateContext.Provider value={create ? emitCreate : null}>
      <Autocomplete<LabelItem>
        options={filteredItems}
        value={itemVal}
        inputValue={searchInput}
        getOptionLabel={option => option.name ?? ""}
        isOptionEqualToValue={(option, selected) => option.id === selected.id}
        filterOptions={options => options}
        autoHighlight
        autoSelect={false}
        forcePopupIcon={!search}
        slots={{ paper: OptionsPaper }}
        slotProps={{ popper: menuLocation ? { placement: menuLocation === "top" ? "top-start" : "bottom-start" } : undefined }}
        onInputChange={(_event, text) => setSearchInput(text)}
        onChange={(_event, selected) => {
          onItemIdChange?.(selected?.id ?? null);
          onChange?.(selected);
        }}
        onKeyUp={(event) => {
          if (event.key === "Enter") emitCreate();
        }}
        onFocus={onFocus}
        renderOption={(props, option) => {
          const { key: _key, ...rest } = props;
          return <li key={option.id} {...rest}>{option.name}</li>;
        }}
        sx={sx}
        renderInput={params => (
          <TextField
            {...params}
            label={label}
            autoFocus={autoFocus}
            variant={search ? "filled" : "outlined"}
            slotProps={{
              ...params.slotProps,
              htmlInput: {
                ...params.slotProps.htmlInput,
                ref: mergeRefs(params.slotProps.htmlInput.ref, inputRef),
              },
              input: {
                ...params.slotProps.input,
                ...(search ? { disableUnderline: true } : {}),
                startAdornment: (
                  <>
                    <InputAdornment position="start">
                      <MdiIcon path={icon || (search ? icons.search : icons.tags)} />
                    </InputAdornment>
                    {params.slotProps.input.startAdornment}
                  </>
                ),
                sx: { borderRadius: search ? 9999 : "4px" },
              },
            }}
          />
        )}
      />
    </CreateContext.Provider>
  );
}
