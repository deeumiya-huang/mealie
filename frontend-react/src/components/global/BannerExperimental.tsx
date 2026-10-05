// Usage: <BannerExperimental issue="https://github.com/…" /> — experimental-feature warning with an optional issue link.
import { useI18n } from "@/i18n";
import { BannerWarning } from "./BannerWarning";

export function BannerExperimental({ issue = "" }: { issue?: string }) {
  const { t } = useI18n();

  return (
    <BannerWarning title={t("banner-experimental.title")} description={t("banner-experimental.description")}>
      {issue
        ? <a href={issue} target="_blank" rel="noreferrer">{t("banner-experimental.issue-link-text")}</a>
        : null}
    </BannerWarning>
  );
}
