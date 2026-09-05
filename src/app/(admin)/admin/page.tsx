import type { Metadata } from "next";
import { headers } from "next/headers";

import { AdminPage } from "@admin/ui/admin-page";
import { PomnenkaLanding } from "@/app/_components/pomnenka-landing";
import { pomnenkaTelegramUrl } from "@/app/_features/trial-quiz/server/trial-telegram";
import {
  POMNENKA_SITE,
  POMNENKA_SITE_HEADER,
  pomnenkaPublicPath,
  titleForSite,
} from "@/app/site-routing";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();

  return {
    title: titleForSite(
      "Memento",
      requestHeaders.get(POMNENKA_SITE_HEADER),
    ),
  };
}

export default async function AdminRoute() {
  const requestHeaders = await headers();
  const isPomnenka = requestHeaders.get(POMNENKA_SITE_HEADER) === POMNENKA_SITE;
  const publicFallback = isPomnenka ? (
    <PomnenkaLanding
      homeUrl={pomnenkaPublicPath("/")}
      telegramUrl={pomnenkaTelegramUrl()}
      trialUrl={pomnenkaPublicPath("/trial")}
    />
  ) : (
    <main>
      <h1>Page not found</h1>
      <p>The page you requested does not exist.</p>
    </main>
  );

  return <AdminPage publicFallback={publicFallback} />;
}
