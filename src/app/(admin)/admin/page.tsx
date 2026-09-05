import type { Metadata } from "next";
import { headers } from "next/headers";

import { AdminPage } from "@admin/ui/admin-page";
import { LanguageSiteLanding } from "@/app/_components/language-site-landing";
import {
  getSiteLanguageFromHeader,
  SITE_APP_HEADER,
} from "@/app/site-routing";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();

  const siteLanguage = getSiteLanguageFromHeader(
    requestHeaders.get(SITE_APP_HEADER),
  );

  return { title: siteLanguage?.appName ?? "Memento" };
}

export default async function AdminRoute() {
  const requestHeaders = await headers();
  const siteLanguage = getSiteLanguageFromHeader(
    requestHeaders.get(SITE_APP_HEADER),
  );
  const publicFallback = siteLanguage ? (
    <LanguageSiteLanding language={siteLanguage} />
  ) : (
    <main>
      <h1>Page not found</h1>
      <p>The page you requested does not exist.</p>
    </main>
  );

  return <AdminPage publicFallback={publicFallback} />;
}
