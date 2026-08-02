import { describe, expect, it, vi } from "vitest";

import { AppError } from "./api";
import { parseTelegramUpdate, processTelegramUpdate } from "./telegram-webhook";

function update(text: string, type = "private") {
  return {
    update_id: 100,
    message: {
      message_id: 7,
      text,
      chat: { id: 42, type },
      from: { id: 42, first_name: "Ada", username: "ada" },
    },
  };
}

function dependencies(
  overrides: Partial<NonNullable<Parameters<typeof processTelegramUpdate>[1]>> = {},
): NonNullable<Parameters<typeof processTelegramUpdate>[1]> {
  return {
    importItems: vi.fn().mockResolvedValue(1),
    prepareReset: vi.fn().mockResolvedValue({
      learningCount: 2,
      hasOpenTask: false,
    }),
    confirmReset: vi.fn().mockResolvedValue({
      learningCount: 2,
      taskCancelled: false,
    }),
    ensureUser: vi.fn().mockResolvedValue(undefined),
    runSpeaking: vi.fn().mockResolvedValue("created"),
    processVoice: vi.fn().mockResolvedValue("completed"),
    ...overrides,
  };
}

describe("Telegram webhook workflow", () => {
  it("imports a validated list and returns a reply target", async () => {
    const importItems = vi.fn().mockResolvedValue(2);
    const parsed = parseTelegramUpdate(
      update("/import\n• urge — desire\n* figure out - understand"),
    );
    if (!parsed) throw new Error("Expected update to parse");

    await expect(
      processTelegramUpdate(parsed, dependencies({ importItems })),
    ).resolves.toMatchObject({
      chatId: 42,
      replyToMessageId: 7,
      text: "✅ Imported 2 phrases!",
    });
    expect(importItems).toHaveBeenCalledWith(
      expect.objectContaining({ id: 42 }),
      [
        { term: "urge", definition: "desire" },
        { term: "figure out", definition: "understand" },
      ],
      "en",
    );
  });

  it("prepares reset and requires an explicit ten-minute confirmation", async () => {
    const prepareReset = vi.fn().mockResolvedValue({
      learningCount: 3,
      hasOpenTask: true,
    });
    const confirmReset = vi.fn().mockResolvedValue({
      learningCount: 3,
      taskCancelled: true,
    });
    const first = parseTelegramUpdate(update("/reset@MementoBot"));
    const confirm = parseTelegramUpdate(update("/reset confirm"));
    if (!first || !confirm) throw new Error("Expected updates to parse");

    const firstReply = await processTelegramUpdate(
      first,
      dependencies({ prepareReset }),
    );
    expect(firstReply?.text).toContain("remove 3 Learning phrases");
    expect(firstReply?.text).toContain("unfinished speaking task");
    expect(firstReply?.text).toContain("/reset confirm within 10 minutes");

    const confirmReply = await processTelegramUpdate(
      confirm,
      dependencies({ confirmReset }),
    );
    expect(confirmReply?.text).toBe(
      "🧹 Done! Removed 3 Learning phrases and cancelled the unfinished speaking task.",
    );
  });

  it("creates or resends a task and returns the empty-practice message", async () => {
    const parsed = parseTelegramUpdate(update("/speaking"));
    if (!parsed) throw new Error("Expected update to parse");
    const runSpeaking = vi.fn().mockResolvedValue("created");
    await expect(
      processTelegramUpdate(parsed, dependencies({ runSpeaking })),
    ).resolves.toBeNull();
    expect(runSpeaking).toHaveBeenCalledWith(42, "en", 42);

    runSpeaking.mockRejectedValue(
      new AppError(
        "NO_PRACTICING_ITEMS",
        "No phrases are ready for speaking practice yet.",
        409,
      ),
    );
    await expect(
      processTelegramUpdate(parsed, dependencies({ runSpeaking })),
    ).resolves.toMatchObject({
      text: "No phrases are ready for speaking practice yet.",
    });
  });

  it("passes voice and exact reply metadata to speaking evaluation", async () => {
    const processVoice = vi.fn().mockResolvedValue("completed");
    const parsed = parseTelegramUpdate({
      update_id: 100,
      message: {
        message_id: 19,
        voice: { file_id: "voice-file", duration: 61 },
        reply_to_message: { message_id: 12 },
        chat: { id: 42, type: "private" },
        from: { id: 42, first_name: "Ada" },
      },
    });
    if (!parsed) throw new Error("Expected update to parse");

    await expect(
      processTelegramUpdate(parsed, dependencies({ processVoice })),
    ).resolves.toBeNull();
    expect(processVoice).toHaveBeenCalledWith(
      {
        chatId: 42,
        userId: 42,
        messageId: 19,
        replyToMessageId: 12,
        fileId: "voice-file",
        durationSeconds: 61,
      },
      "en",
    );
  });

  it("returns concise help and detailed import instructions", async () => {
    const parsed = parseTelegramUpdate(update("/help"));
    if (!parsed) throw new Error("Expected update to parse");
    const reply = await processTelegramUpdate(parsed, dependencies());
    expect(reply?.text).toContain("🎙 /speaking");
    expect(reply?.text).toContain("🧹 /reset");
    expect(reply?.followUps?.[0]?.text).toContain("<b>How to import</b>");
  });

  it("keeps all-or-nothing validation and vocabulary capacity errors", async () => {
    const malformed = parseTelegramUpdate(update("/import\nvalid - definition\ninvalid"));
    const full = parseTelegramUpdate(update("/import\nvalid - definition"));
    if (!malformed || !full) throw new Error("Expected updates to parse");
    const importItems = vi.fn();
    const malformedReply = await processTelegramUpdate(
      malformed,
      dependencies({ importItems }),
    );
    expect(malformedReply?.text).toContain("I couldn’t import that list");
    expect(importItems).not.toHaveBeenCalled();

    importItems.mockRejectedValue(
      new AppError("VOCABULARY_LIMIT_EXCEEDED", "full", 409),
    );
    const capacityReply = await processTelegramUpdate(
      full,
      dependencies({ importItems }),
    );
    expect(capacityReply?.text).toContain("up to 500 phrases");
  });

  it("ignores group and malformed updates", async () => {
    const group = parseTelegramUpdate(update("/speaking", "group"));
    if (!group) throw new Error("Expected update to parse");
    await expect(processTelegramUpdate(group, dependencies())).resolves.toBeNull();
    expect(parseTelegramUpdate({ update_id: "bad" })).toBeNull();
  });
});
