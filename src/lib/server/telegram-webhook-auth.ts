import "server-only";

import { Buffer } from "node:buffer";
import { timingSafeEqual } from "node:crypto";

const TELEGRAM_SECRET_HEADER = "x-telegram-bot-api-secret-token";

export class TelegramWebhookConfigurationError extends Error {
  constructor() {
    super("TELEGRAM_WEBHOOK_SECRET is not configured");
    this.name = "TelegramWebhookConfigurationError";
  }
}

export function authenticateTelegramWebhook(request: Request): boolean {
  const configuredSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!configuredSecret) throw new TelegramWebhookConfigurationError();

  const receivedSecret = request.headers.get(TELEGRAM_SECRET_HEADER) ?? "";
  const configured = Buffer.from(configuredSecret);
  const received = Buffer.from(receivedSecret);

  return (
    configured.length === received.length &&
    timingSafeEqual(configured, received)
  );
}
