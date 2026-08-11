import "server-only";

import { Buffer } from "node:buffer";
import { timingSafeEqual } from "node:crypto";
import type { AppId } from "@/lib/domain/app";
import { getLanguage } from "@/languages/registry";

const TELEGRAM_SECRET_HEADER = "x-telegram-bot-api-secret-token";

export class TelegramWebhookConfigurationError extends Error {
  constructor(variableName: string) {
    super(`${variableName} is not configured`);
    this.name = "TelegramWebhookConfigurationError";
  }
}

export function authenticateTelegramWebhook(
  request: Request,
  appId: AppId = "en",
): boolean {
  const language = getLanguage(appId);
  const configuredSecret = process.env[language.webhookSecretEnv];
  if (!configuredSecret) {
    throw new TelegramWebhookConfigurationError(language.webhookSecretEnv);
  }

  const receivedSecret = request.headers.get(TELEGRAM_SECRET_HEADER) ?? "";
  const configured = Buffer.from(configuredSecret);
  const received = Buffer.from(receivedSecret);

  return (
    configured.length === received.length &&
    timingSafeEqual(configured, received)
  );
}
