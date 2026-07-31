import "server-only";

import { Buffer } from "node:buffer";
import { timingSafeEqual } from "node:crypto";
import type { AppId } from "@/lib/domain/app";
import { readAppSecret, getAppConfig } from "./app-config";

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
  const configuredSecret = readAppSecret(appId, "webhookSecret");
  if (!configuredSecret) {
    throw new TelegramWebhookConfigurationError(
      getAppConfig(appId).webhookSecretEnv,
    );
  }

  const receivedSecret = request.headers.get(TELEGRAM_SECRET_HEADER) ?? "";
  const configured = Buffer.from(configuredSecret);
  const received = Buffer.from(receivedSecret);

  return (
    configured.length === received.length &&
    timingSafeEqual(configured, received)
  );
}
