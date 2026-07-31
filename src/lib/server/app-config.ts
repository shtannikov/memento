import "server-only";

import type { AppId } from "@/lib/domain/app";
import {
  CZECH_STARTER_VOCABULARY,
  ENGLISH_STARTER_VOCABULARY,
} from "@/lib/domain/starter-vocabulary";

export type AppConfig = {
  id: AppId;
  locale: "en" | "cs-CZ";
  targetLanguage: "English" | "Czech";
  botTokenEnv: "TELEGRAM_BOT_TOKEN" | "TELEGRAM_CZ_BOT_TOKEN";
  webhookSecretEnv:
    | "TELEGRAM_WEBHOOK_SECRET"
    | "TELEGRAM_CZ_WEBHOOK_SECRET";
  starterVocabulary: readonly { term: string; definition: string }[];
};

const APP_CONFIGS: Record<AppId, AppConfig> = {
  en: {
    id: "en",
    locale: "en",
    targetLanguage: "English",
    botTokenEnv: "TELEGRAM_BOT_TOKEN",
    webhookSecretEnv: "TELEGRAM_WEBHOOK_SECRET",
    starterVocabulary: ENGLISH_STARTER_VOCABULARY,
  },
  cz: {
    id: "cz",
    locale: "cs-CZ",
    targetLanguage: "Czech",
    botTokenEnv: "TELEGRAM_CZ_BOT_TOKEN",
    webhookSecretEnv: "TELEGRAM_CZ_WEBHOOK_SECRET",
    starterVocabulary: CZECH_STARTER_VOCABULARY,
  },
};

export function getAppConfig(appId: AppId): AppConfig {
  return APP_CONFIGS[appId];
}

export function readAppSecret(
  appId: AppId,
  kind: "botToken" | "webhookSecret",
): string | undefined {
  const config = getAppConfig(appId);
  return process.env[
    kind === "botToken" ? config.botTokenEnv : config.webhookSecretEnv
  ];
}
