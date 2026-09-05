import type { SiteLanguage } from "@/app/_languages/registry";
import { languageTelegramUrl } from "@/app/_server/language-site";
import { sitePublicPath } from "@/app/site-routing";
import { LanguageLanding } from "./language-landing";

type LanguageSiteLandingProps = {
  language: SiteLanguage;
};

export function LanguageSiteLanding({ language }: LanguageSiteLandingProps) {
  const trialUrl = language.site.trial
    ? sitePublicPath(language, language.site.trial.publicPath)
    : undefined;

  return (
    <LanguageLanding
      homeUrl={sitePublicPath(language, "/")}
      language={language}
      telegramUrl={languageTelegramUrl(language)}
      trialUrl={trialUrl}
    />
  );
}
