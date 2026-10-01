import { useMemo } from "react";
import Box from "@mui/material/Box";
import type { SxProps, Theme } from "@mui/material/styles";
import { marked } from "marked";
import { sanitizeMarkdownHtml } from "~/lib/sanitize/markdown";
import { useAppInfo } from "~/lib/app-info";

/** Renders markdown as sanitized HTML (DOMPurify allowlist, see ~/lib/sanitize/markdown). */
export interface SafeMarkdownProps {
  source?: string | null;
  className?: string;
  sx?: SxProps<Theme>;
  /** Render as an inline element (`d-inline` in the Vue templates). */
  inline?: boolean;
}

export function SafeMarkdown({ source = "", className, sx, inline = false }: SafeMarkdownProps) {
  const appInfo = useAppInfo();
  const html = useMemo(() => {
    const rawHtml = marked.parse(source || "", { async: false, breaks: true });
    return sanitizeMarkdownHtml(rawHtml, appInfo?.allowedIframeHosts ?? []);
  }, [source, appInfo?.allowedIframeHosts]);

  return (
    <Box
      component={inline ? "span" : "div"}
      className={[className, inline ? "d-inline" : ""].filter(Boolean).join(" ") || undefined}
      sx={[{
        "& table": { borderCollapse: "collapse", width: "100%" },
        "& th, & td": { border: "1px solid", p: 1, textAlign: "left" },
        "& th": { fontWeight: "bold" },
        "& ul, & ol": { my: 1, pl: "20px" },
        "& p": { my: 0 },
        ...(inline ? { "display": "inline", "& > p": { display: "inline" } } : {}),
      }, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
      // Safe: the HTML is sanitized with DOMPurify above.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default SafeMarkdown;
