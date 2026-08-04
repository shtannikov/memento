import { afterEach, describe, expect, it, vi } from "vitest";

import { deleteTelegramMessage, sendTelegramMessage } from "./telegram-bot";

const originalToken = process.env.TELEGRAM_BOT_TOKEN;
const originalCzechToken = process.env.TELEGRAM_CZ_BOT_TOKEN;

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalToken === undefined) {
    delete process.env.TELEGRAM_BOT_TOKEN;
  } else {
    process.env.TELEGRAM_BOT_TOKEN = originalToken;
  }
  if (originalCzechToken === undefined) {
    delete process.env.TELEGRAM_CZ_BOT_TOKEN;
  } else {
    process.env.TELEGRAM_CZ_BOT_TOKEN = originalCzechToken;
  }
});

describe("Telegram bot client", () => {
  it("sends a reply with reply parameters", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "123:test";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, result: { message_id: 99 } }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await sendTelegramMessage(42, "Imported 2 phrases.", 7);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.telegram.org/bot123:test/sendMessage",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          chat_id: 42,
          text: "Imported 2 phrases.",
          reply_parameters: {
            message_id: 7,
            allow_sending_without_reply: true,
          },
        }),
      }),
    );
  });

  it("sends HTML formatting when requested", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "123:test";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, result: { message_id: 99 } }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await sendTelegramMessage(
      42,
      "Tap <b>App</b> below.",
      7,
      "HTML",
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.telegram.org/bot123:test/sendMessage",
      expect.objectContaining({
        body: JSON.stringify({
          chat_id: 42,
          text: "Tap <b>App</b> below.",
          parse_mode: "HTML",
          reply_parameters: {
            message_id: 7,
            allow_sending_without_reply: true,
          },
        }),
      }),
    );
  });

  it("surfaces Telegram and configuration errors", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "123:test";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ ok: false, description: "chat not found" }),
          { status: 400 },
        ),
      ),
    );
    await expect(sendTelegramMessage(42, "hello")).rejects.toThrow(
      "chat not found",
    );

    delete process.env.TELEGRAM_BOT_TOKEN;
    await expect(sendTelegramMessage(42, "hello")).rejects.toThrow(
      "TELEGRAM_BOT_TOKEN",
    );
  });

  it("sends Czech replies through the Czech bot", async () => {
    process.env.TELEGRAM_CZ_BOT_TOKEN = "456:czech";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, result: { message_id: 99 } }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await sendTelegramMessage(42, "Ahoj", undefined, undefined, "cz");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.telegram.org/bot456:czech/sendMessage",
      expect.any(Object),
    );
  });

  it("deletes an obsolete speaking task message", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "123:test";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, result: true }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await deleteTelegramMessage(42, 88);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.telegram.org/bot123:test/deleteMessage",
      expect.objectContaining({
        body: JSON.stringify({ chat_id: 42, message_id: 88 }),
      }),
    );
  });
});
