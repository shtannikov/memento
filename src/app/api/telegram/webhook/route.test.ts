// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { parseTelegramUpdate, processTelegramUpdate, sendTelegramMessage } =
  vi.hoisted(() => ({
    parseTelegramUpdate: vi.fn(),
    processTelegramUpdate: vi.fn(),
    sendTelegramMessage: vi.fn(),
  }));

vi.mock("@/lib/server/telegram-webhook", () => ({
  parseTelegramUpdate,
  processTelegramUpdate,
}));
vi.mock("@/lib/server/telegram-bot", () => ({
  sendTelegramMessage,
}));

import { POST } from "./route";

const originalSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

function request(secret = "stage-secret") {
  return new Request("https://example.test/api/telegram/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Bot-Api-Secret-Token": secret,
    },
    body: JSON.stringify({ update_id: 100 }),
  });
}

describe("Telegram webhook route", () => {
  beforeEach(() => {
    process.env.TELEGRAM_WEBHOOK_SECRET = "stage-secret";
    parseTelegramUpdate.mockReset();
    processTelegramUpdate.mockReset();
    sendTelegramMessage.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalSecret === undefined) {
      delete process.env.TELEGRAM_WEBHOOK_SECRET;
    } else {
      process.env.TELEGRAM_WEBHOOK_SECRET = originalSecret;
    }
  });

  it("processes an update and sends its reply before acknowledging", async () => {
    const parsed = { update_id: 100 };
    parseTelegramUpdate.mockReturnValue(parsed);
    processTelegramUpdate.mockResolvedValue({
      chatId: 42,
      replyToMessageId: 7,
      text: "Imported 2 phrases.",
    });
    sendTelegramMessage.mockResolvedValue(undefined);

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(processTelegramUpdate).toHaveBeenCalledWith(parsed, undefined, "en");
    expect(sendTelegramMessage).toHaveBeenCalledWith(
      42,
      "Imported 2 phrases.",
      7,
      undefined,
      "en",
      undefined,
    );
  });

  it("forwards Telegram parse mode from the workflow", async () => {
    const parsed = { update_id: 100 };
    parseTelegramUpdate.mockReturnValue(parsed);
    processTelegramUpdate.mockResolvedValue({
      chatId: 42,
      replyToMessageId: 7,
      text: "Tap <b>App</b> below.",
      parseMode: "HTML",
    });
    sendTelegramMessage.mockResolvedValue(undefined);

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(sendTelegramMessage).toHaveBeenCalledWith(
      42,
      "Tap <b>App</b> below.",
      7,
      "HTML",
      "en",
      undefined,
    );
  });

  it("sends help follow-ups as separate messages in order", async () => {
    const parsed = { update_id: 100 };
    parseTelegramUpdate.mockReturnValue(parsed);
    processTelegramUpdate.mockResolvedValue({
      chatId: 42,
      replyToMessageId: 7,
      text: "Command summary",
      parseMode: "HTML",
      followUps: [{ text: "<b>How to import</b>", parseMode: "HTML" }],
    });
    sendTelegramMessage.mockResolvedValue(undefined);

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(sendTelegramMessage).toHaveBeenNthCalledWith(
      1,
      42,
      "Command summary",
      7,
      "HTML",
      "en",
      undefined,
    );
    expect(sendTelegramMessage).toHaveBeenNthCalledWith(
      2,
      42,
      "<b>How to import</b>",
      undefined,
      "HTML",
      "en",
    );
  });

  it("forwards a regeneration inline keyboard", async () => {
    const parsed = { update_id: 100 };
    const inlineKeyboard = [[{
      text: "Regenerate",
      callbackData:
        "speaking:regenerate:550e8400-e29b-41d4-a716-446655440000",
    }]];
    parseTelegramUpdate.mockReturnValue(parsed);
    processTelegramUpdate.mockResolvedValue({
      chatId: 42,
      replyToMessageId: 7,
      text: "Regenerate?",
      inlineKeyboard,
    });
    sendTelegramMessage.mockResolvedValue(undefined);

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(sendTelegramMessage).toHaveBeenCalledWith(
      42,
      "Regenerate?",
      7,
      undefined,
      "en",
      inlineKeyboard,
    );
  });

  it("acknowledges supported updates that need no reply", async () => {
    parseTelegramUpdate.mockReturnValue({ update_id: 100 });
    processTelegramUpdate.mockResolvedValue(null);

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(sendTelegramMessage).not.toHaveBeenCalled();
  });

  it("rejects invalid secrets and malformed bodies", async () => {
    expect((await POST(request("wrong"))).status).toBe(401);
    expect(parseTelegramUpdate).not.toHaveBeenCalled();

    parseTelegramUpdate.mockReturnValue(null);
    expect((await POST(request())).status).toBe(400);
  });

  it("fails closed when configuration or processing fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    delete process.env.TELEGRAM_WEBHOOK_SECRET;
    expect((await POST(request())).status).toBe(503);

    process.env.TELEGRAM_WEBHOOK_SECRET = "stage-secret";
    parseTelegramUpdate.mockReturnValue({ update_id: 100 });
    processTelegramUpdate.mockRejectedValue(new Error("database unavailable"));
    expect((await POST(request())).status).toBe(500);
  });
});
