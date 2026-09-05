import "server-only";

import { CZECH_LANGUAGE } from "@/app/_languages/cz";
import { languageTelegramUrl } from "@/app/_server/language-site";

export function trialTelegramUrl(
  environment: Record<string, string | undefined> = process.env,
): string {
  const startPayload = CZECH_LANGUAGE.site.trial.startPayload;
  return languageTelegramUrl(CZECH_LANGUAGE, startPayload, environment);
}
