import { describe, expect, it, vi } from "vitest";

import {
  configureStageTelegram,
  createStageTargets,
  parseStageOrigin,
} from "./configure-stage-telegram";

const environment = {
  TELEGRAM_BOT_TOKEN: "100:english_stage",
  TELEGRAM_WEBHOOK_SECRET: "english-secret",
  TELEGRAM_CZ_BOT_TOKEN: "200:czech_stage",
  TELEGRAM_CZ_WEBHOOK_SECRET: "czech-secret",
  TELEGRAM_ADMIN_BOT_TOKEN: "300:admin_stage",
};

describe("Stage Telegram configuration", () => {
  it("builds language-specific Preview URLs", () => {
    const origin = parseStageOrigin(
      "https://memento-feature-abc-monologxbot.vercel.app/",
      "Preview",
    );

    expect(createStageTargets(origin, environment)).toEqual([
      expect.objectContaining({
        appId: "en",
        webhookUrl:
          "https://memento-feature-abc-monologxbot.vercel.app/api/telegram/webhook",
        miniAppUrl: "https://memento-feature-abc-monologxbot.vercel.app/",
      }),
      expect.objectContaining({
        appId: "cz",
        webhookUrl:
          "https://memento-feature-abc-monologxbot.vercel.app/api/telegram/webhook/cz",
        miniAppUrl:
          "https://memento-feature-abc-monologxbot.vercel.app/cz",
      }),
      expect.objectContaining({
        appId: "admin",
        menuButtonText: "Admin",
        miniAppUrl:
          "https://memento-feature-abc-monologxbot.vercel.app/admin",
      }),
    ]);
  });

  it.each([
    ["https://memento.vercel.app/", "Preview"],
    ["https://memento-git-main-shtannikov.vercel.app/", "Preview"],
    ["https://example.com/", "Preview"],
    ["https://memento-feature.vercel.app/", "Production"],
  ])("rejects a non-Stage target: %s (%s)", (url, target) => {
    expect(() => parseStageOrigin(url, target)).toThrow("Refusing");
  });

  it("updates and verifies the webhook and menu button", async () => {
    const target = createStageTargets(
      new URL("https://memento-feature.vercel.app/"),
      environment,
    )[0];
    const responses = [
      { ok: true, result: { id: 100, username: "memento_stage_bot" } },
      { ok: true, result: true },
      { ok: true, result: true },
      { ok: true, result: { url: target.webhookUrl } },
      {
        ok: true,
        result: {
          type: "web_app",
          text: "App",
          web_app: { url: target.miniAppUrl },
        },
      },
    ];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toContain("https://api.telegram.org/bot");
      expect(init?.method).toBe("POST");
      return new Response(JSON.stringify(responses.shift()), {
        headers: { "content-type": "application/json" },
      });
    });

    await expect(
      configureStageTelegram([target], fetchMock as unknown as typeof fetch),
    ).resolves.toEqual([
      `Memento (@memento_stage_bot): ${target.miniAppUrl}`,
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(fetchMock.mock.calls[1]?.[0]).toContain("/setWebhook");
    expect(fetchMock.mock.calls[2]?.[0]).toContain("/setChatMenuButton");
  });

  it("configures the admin menu without installing a webhook", async () => {
    const target = createStageTargets(
      new URL("https://memento-feature.vercel.app/"),
      environment,
    )[2];
    const responses = [
      { ok: true, result: { id: 300, username: "memento_admin_stage_bot" } },
      { ok: true, result: true },
      {
        ok: true,
        result: {
          type: "web_app",
          text: "Admin",
          web_app: { url: target.miniAppUrl },
        },
      },
    ];
    const fetchMock = vi.fn(async (input: RequestInfo | URL) =>
      new Response(JSON.stringify(responses.shift()), {
        headers: { "content-type": "application/json" },
        status: String(input).includes("api.telegram.org") ? 200 : 500,
      }),
    );

    await expect(
      configureStageTelegram([target], fetchMock as unknown as typeof fetch),
    ).resolves.toEqual([
      `Memento Admin (@memento_admin_stage_bot): ${target.miniAppUrl}`,
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1]?.[0]).toContain("/setChatMenuButton");
    expect(fetchMock.mock.calls[2]?.[0]).toContain("/getChatMenuButton");
  });

  it("preflights every bot before changing either one", async () => {
    const targets = createStageTargets(
      new URL("https://memento-feature.vercel.app/"),
      environment,
    );
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true, result: { id: 100 } })),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ ok: false, description: "Unauthorized" }),
          { status: 401 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true, result: { id: 300 } })),
      );

    await expect(
      configureStageTelegram(targets, fetchMock as unknown as typeof fetch),
    ).rejects.toThrow("Unauthorized");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
