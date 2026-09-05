import { headers } from "next/headers";

import { PomnenkaLanding } from "@/app/_components/pomnenka-landing";
import { pomnenkaTelegramUrl } from "@/app/_features/trial-quiz/server/trial-telegram";
import {
  POMNENKA_SITE,
  POMNENKA_SITE_HEADER,
  pomnenkaPublicPath,
} from "@/app/site-routing";

export async function PublicNotFound() {
  const requestHeaders = await headers();
  if (requestHeaders.get(POMNENKA_SITE_HEADER) === POMNENKA_SITE) {
    return (
      <PomnenkaLanding
        homeUrl={pomnenkaPublicPath("/")}
        telegramUrl={pomnenkaTelegramUrl()}
        trialUrl={pomnenkaPublicPath("/trial")}
      />
    );
  }

  return (
    <main>
      <h1>Page not found</h1>
      <p>The page you requested does not exist.</p>
    </main>
  );
}

export default PublicNotFound;
