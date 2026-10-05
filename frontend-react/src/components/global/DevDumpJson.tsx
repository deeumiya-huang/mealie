// Usage: <DevDumpJson data={obj} /> — pretty-printed JSON in a <pre>.
export function DevDumpJson({ data }: { data: object }) {
  const prettyJson = JSON.stringify(data, null, 2);

  return (
    <pre>
      {prettyJson}
    </pre>
  );
}
