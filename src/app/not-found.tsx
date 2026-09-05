import { headers } from "next/headers";

import { LanguageSiteLanding } from "@/app/_components/language-site-landing";
import { getSiteLanguageFromHeader, SITE_APP_HEADER } from "@/app/site-routing";

export async function PublicNotFound() {
  const requestHeaders = await headers();
  const siteLanguage = getSiteLanguageFromHeader(
    requestHeaders.get(SITE_APP_HEADER),
  );
  if (siteLanguage) {
    return <LanguageSiteLanding language={siteLanguage} />;
  }

  return (
    <main>
      <h1>Page not found</h1>
      <p>The page you requested does not exist.</p>
    </main>
  );
}

export default PublicNotFound;
