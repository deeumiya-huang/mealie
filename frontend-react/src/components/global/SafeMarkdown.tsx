import { useMemo } from "react";
import Box from "@mui/material/Box";
import { marked } from "marked";
import { sanitizeMarkdownHtml } from "~/lib/sanitize/markdown";
import { useAppInfo } from "~/lib/app-info";

/** Renders markdown as sanitized HTML (DOMPurify allowlist, see ~/lib/sanitize/markdown). */
export function SafeMarkdown({ source = "" }: { source?: string | null }) {
  const appInfo = useAppInfo();
  const html = useMemo(() => {
    const rawHtml = marked.parse(source || "", { async: false, breaks: true });
    return sanitizeMarkdownHtml(rawHtml, appInfo?.allowedIframeHosts ?? []);
  }, [source, appInfo?.allowedIframeHosts]);

  return (
    <Box
      sx={{
        "& table": { borderCollapse: "collapse", width: "100%" },
        "& th, & td": { border: "1px solid", p: 1, textAlign: "left" },
        "& th": { fontWeight: "bold" },
        "& ul, & ol": { my: 1, pl: "20px" },
        "& p": { my: 0 },
      }}
      // Safe: the HTML is sanitized with DOMPurify above.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default SafeMarkdown;
