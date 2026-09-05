import "server-only";

import type { SiteLanguage } from "@/app/_languages/registry";

const BOT_USERNAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]{4,31}$/;

export function languageTelegramUrl(
  language: SiteLanguage,
  startPayload?: string,
  environment: Record<string, string | undefined> = process.env,
): string {
  const site = language.site;

  const configured = environment[site.previewBotUsernameEnv]?.trim();
  if (!configured && environment.VERCEL_ENV === "preview") {
    throw new Error(
      `${site.previewBotUsernameEnv} is required for Preview builds`,
    );
  }
  const username = configured ?? site.productionBotUsername;
  if (!BOT_USERNAME_PATTERN.test(username)) {
    throw new Error(`${site.previewBotUsernameEnv} is not a valid bot username`);
  }

  const url = `https://t.me/${username}`;
  return startPayload ? `${url}?start=${encodeURIComponent(startPayload)}` : url;
}
