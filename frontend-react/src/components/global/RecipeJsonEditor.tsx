// Usage: <RecipeJsonEditor value={recipe} onChange={setRecipe} height="700px" mode="text" mainMenuBar={false} readOnly />
// JSON editor (vanilla-jsoneditor, the editor json-editor-vue wraps). `value` is an object; edits that parse as JSON
// call `onChange(object)`, text that does not parse keeps the previous value. `mode`, `mainMenuBar` and `readOnly`
// are the editor options Vue passed through `$attrs`.
import { useEffect, useRef } from "react";
import Box from "@mui/material/Box";
import { createJSONEditor, type Content, type JsonEditor, type Mode } from "vanilla-jsoneditor";

interface RecipeJsonEditorProps {
  value?: object;
  onChange?: (value: object) => void;
  height?: string;
  mode?: Mode;
  mainMenuBar?: boolean;
  readOnly?: boolean;
  className?: string;
}

const EMPTY: object = {};

/** Only the options the caller set, so the editor keeps its own defaults for the rest. */
function definedOptions(mode: Mode | undefined, mainMenuBar: boolean | undefined, readOnly: boolean | undefined) {
  return {
    ...(mode !== undefined && { mode }),
    ...(mainMenuBar !== undefined && { mainMenuBar }),
    ...(readOnly !== undefined && { readOnly }),
  };
}

export function RecipeJsonEditor({
  value = EMPTY,
  onChange,
  height = "1500px",
  mode,
  mainMenuBar,
  readOnly,
  className,
}: RecipeJsonEditorProps) {
  const target = useRef<HTMLDivElement | null>(null);
  const editor = useRef<JsonEditor | null>(null);
  // the value the editor currently shows / last emitted, so our own edits don't reset the editor
  const lastValue = useRef<object>(value);
  const latest = useRef({ value, onChange });

  useEffect(() => {
    latest.current = { value, onChange };
  });

  function parseEvent(event: unknown): object {
    const current = latest.current.value || {};
    if (!event) {
      return current;
    }
    try {
      const content = event as { json?: object; text?: string };
      if (content.json) {
        return content.json;
      }
      else if (content.text) {
        return JSON.parse(content.text) as object;
      }
      else {
        return event as object;
      }
    }
    catch {
      return current;
    }
  }

  useEffect(() => {
    const element = target.current;
    if (!element) return;

    const created = createJSONEditor({
      target: element,
      props: {
        content: { json: lastValue.current } as Content,
        ...definedOptions(mode, mainMenuBar, readOnly),
        onChange: (content: Content) => {
          const parsed = parseEvent(content);
          if (parsed !== latest.current.value) {
            lastValue.current = parsed;
            latest.current.onChange?.(parsed);
          }
        },
      },
    });
    editor.current = created;

    return () => {
      editor.current = null;
      void created.destroy();
    };
    // the editor is created once; later prop changes are applied by the effect below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!editor.current) return;
    const props: Parameters<JsonEditor["updateProps"]>[0] = definedOptions(mode, mainMenuBar, readOnly);
    if (value !== lastValue.current) {
      lastValue.current = value;
      props.content = { json: value } as Content;
    }
    void editor.current.updateProps(props);
  }, [value, mode, mainMenuBar, readOnly]);

  return <Box ref={target} className={className} sx={{ height }} />;
}
