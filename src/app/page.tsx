import { headers } from "next/headers";

import { LanguageSiteLanding } from "@/app/_components/language-site-landing";
import { MementoApp } from "@/app/memento-app";
import { getSiteLanguageFromHeader, SITE_APP_HEADER } from "@/app/site-routing";
import { ENGLISH_LANGUAGE } from "@/app/_languages/en";

export default async function Page() {
  const requestHeaders = await headers();
  const siteLanguage = getSiteLanguageFromHeader(
    requestHeaders.get(SITE_APP_HEADER),
  );
  if (siteLanguage) {
    return <LanguageSiteLanding language={siteLanguage} />;
  }

  return (
    <MementoApp
      appId={ENGLISH_LANGUAGE.id}
      appName={ENGLISH_LANGUAGE.appName}
      addPhrasePlaceholders={ENGLISH_LANGUAGE.addPhrasePlaceholders}
      speakingEnabled={Boolean(ENGLISH_LANGUAGE.speaking)}
    />
  );
}
