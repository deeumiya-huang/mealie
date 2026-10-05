import { useCallback } from "react";
import { alert } from "@/hooks/use-toast";
import { getGlobalI18n } from "@/i18n";
import { http } from "@/lib/http";

/** Port of composables/api/use-downloader.ts: returns `download(url, filename)`. */
export function useDownloader() {
  return useCallback((url: string, filename: string) => {
    void http.get<Blob>(url, { responseType: "blob", suppressAlert: true }).then(
      (response) => {
        const objectUrl = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = objectUrl;
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
      },
      (error) => {
        console.error("Download failed", error);
        alert.error(getGlobalI18n().t("events.something-went-wrong"));
      },
    );
  }, []);
}
