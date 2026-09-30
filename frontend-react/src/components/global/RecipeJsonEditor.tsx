import { useEffect, useRef } from "react";
import { createJSONEditor } from "vanilla-jsoneditor";
import type { Content, JsonEditor } from "vanilla-jsoneditor";

export interface RecipeJsonEditorProps {
  value: object;
  onChange: (value: object) => void;
  height?: string;
  mainMenuBar?: boolean;
  navigationBar?: boolean;
  statusBar?: boolean;
  /** "code" is json-editor-vue's legacy name for the text mode. */
  mode?: "tree" | "text" | "table" | "code";
  readOnly?: boolean;
}

function parseContent(content: Content, fallback: object): object {
  try {
    if ("json" in content && content.json !== undefined) {
      return content.json as object;
    }
    if ("text" in content && content.text) {
      return JSON.parse(content.text) as object;
    }
  }
  catch {
    // invalid JSON while typing: keep the last good value
  }
  return fallback;
}

/** JSON editor (json-editor-vue in the Vue app; both wrap vanilla-jsoneditor). */
export function RecipeJsonEditor({ value, onChange, height = "1500px", mainMenuBar, navigationBar, statusBar, mode: modeProp, readOnly = false }: RecipeJsonEditorProps) {
  const mode = modeProp === "code" ? "text" : modeProp;
  const target = useRef<HTMLDivElement>(null);
  const editor = useRef<JsonEditor | null>(null);
  const latest = useRef({ value, onChange });
  latest.current = { value, onChange };

  useEffect(() => {
    if (!target.current) return;
    editor.current = createJSONEditor({
      target: target.current,
      props: {
        content: { json: latest.current.value },
        mainMenuBar,
        navigationBar,
        statusBar,
        mode: mode as never,
        readOnly,
        onChange: (content: Content) => {
          const parsed = parseContent(content, latest.current.value || {});
          if (parsed !== latest.current.value) {
            latest.current.onChange(parsed);
          }
        },
      },
    });
    return () => {
      void editor.current?.destroy();
      editor.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- created once; content synced below
  }, []);

  useEffect(() => {
    const current = editor.current?.get();
    if (editor.current && current && "json" in current && current.json !== value) {
      void editor.current.update({ json: value });
    }
  }, [value]);

  useEffect(() => {
    void editor.current?.updateProps({ mode: mode as never, readOnly });
  }, [mode, readOnly]);

  return <div ref={target} style={{ height }} />;
}

export default RecipeJsonEditor;
