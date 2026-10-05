// Usage: <SafeMarkdown source={recipe.description} />
// Renders markdown (marked, `breaks: true`) as HTML sanitised by DOMPurify (lib/sanitize/markdown), with
// iframes allowed only for the server's `allowedIframeHosts`. The only place markdown becomes HTML.
import { useMemo } from "react";
import Box from "@mui/material/Box";
import { marked } from "marked";
import { sanitizeMarkdownHtml } from "@/lib/sanitize/markdown";
import { useAppInfo } from "@/providers/app-info";

interface SafeMarkdownProps {
  source?: string | null;
}

export function SafeMarkdown({ source = "" }: SafeMarkdownProps) {
  const appInfo = useAppInfo();
  const allowedIframeHosts = appInfo?.allowedIframeHosts;

  const html = useMemo(() => {
    const rawHtml = marked.parse(source || "", { async: false, breaks: true });
    return sanitizeMarkdownHtml(rawHtml, allowedIframeHosts ?? []);
  }, [source, allowedIframeHosts]);

  return (
    <Box
      sx={{
        "& table": { borderCollapse: "collapse", width: "100%" },
        "& th, & td": { border: "1px solid", padding: "8px", textAlign: "left" },
        "& th": { fontWeight: "bold" },
        "& ul, & ol": { margin: "8px 0", paddingLeft: "20px" },
      }}
      // sanitised by DOMPurify above
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
