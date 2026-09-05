import {
  APP_IDS,
  getLanguage,
  isAppId,
  isSiteLanguage,
  type SiteLanguage,
} from "@/app/_languages/registry";

export const SITE_APP_HEADER = "x-memento-site-app";

export function getSiteLanguageForRequest(
  hostname: string,
  requestedAppId: string | null,
  vercelEnvironment = process.env.VERCEL_ENV,
): SiteLanguage | null {
  if (vercelEnvironment === "production") {
    return (
      APP_IDS.map(getLanguage)
        .filter(isSiteLanguage)
        .find((language) => language.site.hostname === hostname) ?? null
    );
  }

  if (!requestedAppId || !isAppId(requestedAppId)) return null;
  const language = getLanguage(requestedAppId);
  return isSiteLanguage(language) ? language : null;
}

export function getSiteLanguageFromHeader(appId: string | null) {
  if (!appId || !isAppId(appId)) return null;
  const language = getLanguage(appId);
  return isSiteLanguage(language) ? language : null;
}

export function sitePublicPath(
  language: SiteLanguage,
  path: string,
  vercelEnvironment = process.env.VERCEL_ENV,
) {
  return vercelEnvironment === "production"
    ? path
    : `${path}?site=${language.id}`;
}
