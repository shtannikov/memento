import { afterEach, describe, expect, it, vi } from "vitest";

import {
  answerTelegramCallbackQuery,
  deleteTelegramMessage,
  editTelegramMessage,
  sendTelegramMessage,
} from "./bot";

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

  it("sends a single-row inline keyboard", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "123:test";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, result: { message_id: 99 } }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await sendTelegramMessage(
      42,
      "Regenerate?",
      7,
      undefined,
      "en",
      [[{
        text: "Regenerate",
        callbackData:
          "speaking:regenerate:550e8400-e29b-41d4-a716-446655440000",
      }]],
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.telegram.org/bot123:test/sendMessage",
      expect.objectContaining({
        body: JSON.stringify({
          chat_id: 42,
          text: "Regenerate?",
          reply_markup: {
            inline_keyboard: [[{
              text: "Regenerate",
              callback_data:
                "speaking:regenerate:550e8400-e29b-41d4-a716-446655440000",
            }]],
          },
          reply_parameters: {
            message_id: 7,
            allow_sending_without_reply: true,
          },
        }),
      }),
    );
  });

  it("acknowledges callbacks and edits confirmation messages without buttons", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "123:test";
    const fetchMock = vi.fn().mockImplementation(async () =>
      new Response(JSON.stringify({ ok: true, result: true }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await answerTelegramCallbackQuery("callback-1");
    await editTelegramMessage(42, 9, "Regenerating…");

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://api.telegram.org/bot123:test/answerCallbackQuery",
      expect.objectContaining({
        body: JSON.stringify({ callback_query_id: "callback-1" }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://api.telegram.org/bot123:test/editMessageText",
      expect.objectContaining({
        body: JSON.stringify({
          chat_id: 42,
          message_id: 9,
          text: "Regenerating…",
          reply_markup: { inline_keyboard: [] },
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
