import { useCallback } from "react";
import { alert } from "~/hooks/use-toast";
import { useGlobalI18n } from "~/hooks/use-global-i18n";

export async function downloadFile(url: string, filename: string): Promise<void> {
  const response = await fetch(url, { method: "GET", credentials: "include" }).catch(() => null);
  if (!response?.ok) {
    console.error("Download failed", response);
    alert.error(useGlobalI18n().t("events.something-went-wrong"));
    return;
  }

  const objectUrl = window.URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = objectUrl;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function useDownloader() {
  return useCallback((url: string, filename: string) => {
    void downloadFile(url, filename);
  }, []);
}
