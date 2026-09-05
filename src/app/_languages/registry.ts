import { CZECH_LANGUAGE } from "./cz";
import { ENGLISH_LANGUAGE } from "./en";
import type { LanguageDefinition, LanguageSiteDefinition } from "./types";

const LANGUAGE_REGISTRY = {
  [ENGLISH_LANGUAGE.id]: ENGLISH_LANGUAGE,
  [CZECH_LANGUAGE.id]: CZECH_LANGUAGE,
} as const;

export type AppId = keyof typeof LANGUAGE_REGISTRY;
export type Language = LanguageDefinition<AppId>;
export type SiteLanguage = Language & { site: LanguageSiteDefinition };

export const APP_IDS = Object.keys(LANGUAGE_REGISTRY) as AppId[];

export function isAppId(value: string): value is AppId {
  return Object.prototype.hasOwnProperty.call(LANGUAGE_REGISTRY, value);
}

export function getLanguage(appId: AppId): Language {
  return LANGUAGE_REGISTRY[appId];
}

export function getLanguageFromRoute(value: string): Language | null {
  return isAppId(value) ? getLanguage(value) : null;
}

export function isSiteLanguage(language: Language): language is SiteLanguage {
  return Boolean(language.site);
}
