import { useI18n } from "~/hooks/use-global-i18n";
import { BannerWarning } from "./BannerWarning";

export function BannerExperimental({ issue = "" }: { issue?: string }) {
  const i18n = useI18n();
  return (
    <BannerWarning title={i18n.t("banner-experimental.title")} description={i18n.t("banner-experimental.description")}>
      {issue
        ? <a href={issue} target="_blank" rel="noreferrer">{i18n.t("banner-experimental.issue-link-text")}</a>
        : undefined}
    </BannerWarning>
  );
}

export default BannerExperimental;
