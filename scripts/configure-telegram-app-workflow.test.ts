import { describe, expect, it, vi } from "vitest";

import { configureTelegramApp } from "./configure-telegram-app-workflow";

const options = {
  webhookUrl: "https://preview.example.test/api/telegram/webhook/cz",
  miniAppUrl: "https://preview.example.test/cz",
  webhookSecret: "test-secret",
};

describe("Telegram app configuration workflow", () => {
  it("configures and verifies the language-specific URLs", async () => {
    const telegram = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ url: options.webhookUrl });

    await configureTelegramApp(telegram, options);

    expect(telegram).toHaveBeenNthCalledWith(1, "setWebhook", {
      url: options.webhookUrl,
      secret_token: options.webhookSecret,
      allowed_updates: ["message"],
      drop_pending_updates: false,
    });
    expect(telegram).toHaveBeenNthCalledWith(2, "setChatMenuButton", {
      menu_button: {
        type: "web_app",
        text: "App",
        web_app: { url: options.miniAppUrl },
      },
    });
    expect(telegram).toHaveBeenNthCalledWith(3, "getWebhookInfo", {});
  });

  it("rejects a webhook configured for another deployment", async () => {
    const telegram = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ url: "https://wrong.example.test/webhook" });

    await expect(configureTelegramApp(telegram, options)).rejects.toThrow(
      "Telegram returned an unexpected webhook URL",
    );
  });
});
