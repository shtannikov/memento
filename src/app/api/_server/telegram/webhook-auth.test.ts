import { afterEach, describe, expect, it } from "vitest";

import {
  authenticateTelegramWebhook,
  TelegramWebhookConfigurationError,
} from "./webhook-auth";

const originalSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
const originalCzechSecret = process.env.TELEGRAM_CZ_WEBHOOK_SECRET;

afterEach(() => {
  if (originalSecret === undefined) {
    delete process.env.TELEGRAM_WEBHOOK_SECRET;
  } else {
    process.env.TELEGRAM_WEBHOOK_SECRET = originalSecret;
  }
  if (originalCzechSecret === undefined) {
    delete process.env.TELEGRAM_CZ_WEBHOOK_SECRET;
  } else {
    process.env.TELEGRAM_CZ_WEBHOOK_SECRET = originalCzechSecret;
  }
});

describe("Telegram webhook authentication", () => {
  it("accepts only the configured secret header", () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = "stage-secret";
    expect(
      authenticateTelegramWebhook(
        new Request("https://example.test", {
          headers: {
            "X-Telegram-Bot-Api-Secret-Token": "stage-secret",
          },
        }),
      ),
    ).toBe(true);
    expect(
      authenticateTelegramWebhook(
        new Request("https://example.test", {
          headers: {
            "X-Telegram-Bot-Api-Secret-Token": "wrong-secret",
          },
        }),
      ),
    ).toBe(false);
    expect(
      authenticateTelegramWebhook(new Request("https://example.test")),
    ).toBe(false);
  });

  it("fails closed when the server secret is missing", () => {
    delete process.env.TELEGRAM_WEBHOOK_SECRET;
    expect(() =>
      authenticateTelegramWebhook(new Request("https://example.test")),
    ).toThrow(TelegramWebhookConfigurationError);
  });

  it("uses an independent secret for the Czech webhook", () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = "english-secret";
    process.env.TELEGRAM_CZ_WEBHOOK_SECRET = "czech-secret";
    const request = new Request("https://example.test", {
      headers: { "X-Telegram-Bot-Api-Secret-Token": "czech-secret" },
    });
    expect(authenticateTelegramWebhook(request, "cz")).toBe(true);
    expect(authenticateTelegramWebhook(request, "en")).toBe(false);
  });
});
