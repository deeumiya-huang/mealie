import { useCallback } from "react";
import { alert } from "@/hooks/use-toast";
import { getGlobalI18n } from "@/i18n";

/**
 * Port of composables/api/use-downloader.ts: returns `download(url, filename)`. Like Nuxt's `useFetch`, it
 * fetches outside the axios instance (no auth refresh/logout or error toasts from its interceptors).
 */
export function useDownloader() {
  return useCallback((url: string, filename: string) => {
    void fetch(url).then(async (response) => {
      if (!response.ok) {
        console.error("Download failed", response);
        alert.error(getGlobalI18n().t("events.something-went-wrong"));
        return;
      }

      const objectUrl = window.URL.createObjectURL(new Blob([await response.blob()]));
      const link = document.createElement("a");
      link.href = objectUrl;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      // give the browser time to start the download before the blob URL goes away (as FileSaver.js does)
      setTimeout(() => window.URL.revokeObjectURL(objectUrl), 40_000);
    }, (error: unknown) => {
      console.error("Download failed", error);
      alert.error(getGlobalI18n().t("events.something-went-wrong"));
    });
  }, []);
}
