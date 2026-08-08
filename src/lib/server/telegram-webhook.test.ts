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

function regenerationCallback(data = "speaking:regenerate:550e8400-e29b-41d4-a716-446655440000") {
  return {
    update_id: 101,
    callback_query: {
      id: "callback-1",
      data,
      message: {
        message_id: 9,
        chat: { id: 42, type: "private" },
      },
      from: { id: 42, first_name: "Ada", username: "ada" },
    },
  };
}

function resetCallback() {
  return regenerationCallback("vocabulary:reset");
}

function dependencies(
  overrides: Partial<NonNullable<Parameters<typeof processTelegramUpdate>[1]>> = {},
): NonNullable<Parameters<typeof processTelegramUpdate>[1]> {
  return {
    importItems: vi.fn().mockResolvedValue(1),
    prepareReset: vi.fn().mockResolvedValue({
      learningCount: 2,
    }),
    confirmReset: vi.fn().mockResolvedValue({
      learningCount: 2,
    }),
    ensureUser: vi.fn().mockResolvedValue(undefined),
    hasActiveSpeakingTask: vi.fn().mockResolvedValue(false),
    runSpeaking: vi.fn().mockResolvedValue("created"),
    regenerateSpeaking: vi.fn().mockResolvedValue("created"),
    processVoice: vi.fn().mockResolvedValue("completed"),
    sendTyping: vi.fn().mockResolvedValue(undefined),
    answerCallback: vi.fn().mockResolvedValue(undefined),
    editMessage: vi.fn().mockResolvedValue(undefined),
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

  it("prepares reset and returns an inline confirmation button", async () => {
    const prepareReset = vi.fn().mockResolvedValue({
      learningCount: 3,
    });
    const first = parseTelegramUpdate(update("/reset@MementoBot"));
    if (!first) throw new Error("Expected update to parse");

    const firstReply = await processTelegramUpdate(
      first,
      dependencies({ prepareReset }),
    );
    expect(firstReply?.text).toBe(
      "⚠️ Reset your Learning list?\n\n" +
        "This will remove all 3 phrases from your Learning list. " +
        "Everything else will stay just as it is.",
    );
    expect(firstReply?.inlineKeyboard).toEqual([[{
      text: "Reset",
      callbackData: "vocabulary:reset",
    }]]);
  });

  it("acknowledges a reset callback and updates its confirmation message", async () => {
    const parsed = parseTelegramUpdate(resetCallback());
    if (!parsed) throw new Error("Expected callback to parse");
    const order: string[] = [];
    const answerCallback = vi.fn(async () => { order.push("answer"); });
    const editMessage = vi.fn(async (_chatId, _messageId, text) => {
      order.push(text);
    });
    const confirmReset = vi.fn(async () => {
      order.push("reset");
      return { learningCount: 3 };
    });

    await expect(processTelegramUpdate(parsed, dependencies({
      answerCallback,
      editMessage,
      confirmReset,
    }))).resolves.toBeNull();

    expect(answerCallback).toHaveBeenCalledWith("callback-1", "en");
    expect(confirmReset).toHaveBeenCalledWith(
      { id: 42, first_name: "Ada", last_name: undefined, username: "ada" },
      "en",
    );
    expect(order).toEqual([
      "answer",
      "⏳ Resetting your Learning phrases…",
      "reset",
      "🧹 Done! The Learning list has been reset.",
    ]);
  });

  it("turns an expired reset callback into a retry warning", async () => {
    const parsed = parseTelegramUpdate(resetCallback());
    if (!parsed) throw new Error("Expected callback to parse");
    const editMessage = vi.fn().mockResolvedValue(undefined);
    const confirmReset = vi.fn().mockRejectedValue(
      new AppError(
        "RESET_CONFIRMATION_EXPIRED",
        "That reset confirmation has expired. Send /reset to start again.",
        409,
      ),
    );

    await processTelegramUpdate(parsed, dependencies({
      editMessage,
      confirmReset,
    }));

    expect(editMessage).toHaveBeenLastCalledWith(
      42,
      9,
      "That reset confirmation has expired. Send /reset to start again.",
      "en",
    );
    expect(confirmReset).toHaveBeenCalledOnce();
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
        "🎙 Nothing in Practicing yet. Keep reviewing your Learning phrases in quizzes, or tap Done in the App to move one to Practicing.",
        409,
      ),
    );
    await expect(
      processTelegramUpdate(parsed, dependencies({ runSpeaking })),
    ).resolves.toMatchObject({
      text: "🎙 Nothing in Practicing yet. Keep reviewing your Learning phrases in quizzes, or tap Done in the App to move one to Practicing.",
    });
  });

  it("asks for confirmation before regenerating an active task", async () => {
    const parsed = parseTelegramUpdate(update("/speaking"));
    if (!parsed) throw new Error("Expected update to parse");
    const runSpeaking = vi.fn().mockResolvedValue({
      kind: "confirmation",
      activeTaskId: "550e8400-e29b-41d4-a716-446655440000",
    });

    await expect(
      processTelegramUpdate(parsed, dependencies({ runSpeaking })),
    ).resolves.toMatchObject({
      chatId: 42,
      replyToMessageId: 7,
      text: expect.stringContaining(
        "Please note: the daily limit is 5 speaking tasks.",
      ),
      inlineKeyboard: [[{
        text: "Regenerate",
        callbackData:
          "speaking:regenerate:550e8400-e29b-41d4-a716-446655440000",
      }]],
    });
  });

  it("acknowledges a regeneration callback and updates its confirmation message", async () => {
    const parsed = parseTelegramUpdate(regenerationCallback());
    if (!parsed) throw new Error("Expected callback to parse");
    const order: string[] = [];
    const answerCallback = vi.fn(async () => { order.push("answer"); });
    const editMessage = vi.fn(async (_chatId, _messageId, text) => {
      order.push(text);
    });
    const regenerateSpeaking = vi.fn(async () => {
      order.push("regenerate");
      return "created" as const;
    });

    await expect(processTelegramUpdate(parsed, dependencies({
      answerCallback,
      editMessage,
      regenerateSpeaking,
    }))).resolves.toBeNull();

    expect(answerCallback).toHaveBeenCalledWith("callback-1", "en");
    expect(regenerateSpeaking).toHaveBeenCalledWith(
      42,
      "en",
      42,
      "550e8400-e29b-41d4-a716-446655440000",
    );
    expect(order).toEqual([
      "answer",
      "⏳ Regenerating your speaking task…",
      "regenerate",
      "✅ Your new speaking task is ready.",
    ]);
  });

  it("turns stale regeneration callbacks into an inactive warning", async () => {
    const parsed = parseTelegramUpdate(regenerationCallback());
    if (!parsed) throw new Error("Expected callback to parse");
    const editMessage = vi.fn().mockResolvedValue(undefined);
    const regenerateSpeaking = vi.fn().mockRejectedValue(
      new AppError("REGENERATION_STALE", "stale", 409),
    );

    await processTelegramUpdate(parsed, dependencies({
      editMessage,
      regenerateSpeaking,
    }));

    expect(editMessage).toHaveBeenLastCalledWith(
      42,
      9,
      "This regeneration request is no longer active. Send /speaking to check your current task.",
      "en",
    );
    expect(regenerateSpeaking).toHaveBeenCalledOnce();
  });

  it("does not start another generation for a callback already being processed", async () => {
    const parsed = parseTelegramUpdate(regenerationCallback());
    if (!parsed) throw new Error("Expected callback to parse");
    const editMessage = vi.fn().mockResolvedValue(undefined);
    const regenerateSpeaking = vi.fn().mockRejectedValue(
      new AppError("TASK_PREPARING", "preparing", 409),
    );

    await processTelegramUpdate(parsed, dependencies({
      editMessage,
      regenerateSpeaking,
    }));

    expect(editMessage).toHaveBeenLastCalledWith(
      42,
      9,
      "⏳ A new speaking task is already being prepared.",
      "en",
    );
    expect(regenerateSpeaking).toHaveBeenCalledOnce();
  });

  it("ignores foreign and unsupported callback data", async () => {
    const foreign = regenerationCallback();
    foreign.callback_query.from.id = 99;
    const parsedForeign = parseTelegramUpdate(foreign);
    const parsedUnsupported = parseTelegramUpdate(
      regenerationCallback("unrelated:action"),
    );
    if (!parsedForeign || !parsedUnsupported) {
      throw new Error("Expected callbacks to parse");
    }
    const answerCallback = vi.fn().mockResolvedValue(undefined);
    const editMessage = vi.fn().mockResolvedValue(undefined);
    const regenerateSpeaking = vi.fn().mockResolvedValue("created" as const);
    const deps = dependencies({
      answerCallback,
      editMessage,
      regenerateSpeaking,
    });

    await expect(processTelegramUpdate(parsedForeign, deps)).resolves.toBeNull();
    expect(answerCallback).not.toHaveBeenCalled();

    await expect(processTelegramUpdate(parsedUnsupported, deps)).resolves.toBeNull();
    expect(answerCallback).toHaveBeenCalledWith("callback-1", "en");
    expect(editMessage).not.toHaveBeenCalled();
    expect(regenerateSpeaking).not.toHaveBeenCalled();
  });

  it("passes voice and exact reply metadata to speaking evaluation", async () => {
    const processVoice = vi.fn().mockResolvedValue("completed");
    const order: string[] = [];
    const sendTyping = vi.fn(async () => {
      order.push("typing");
    });
    const ensureUser = vi.fn(async () => {
      order.push("ensure-user");
    });
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
      processTelegramUpdate(
        parsed,
        dependencies({ processVoice, sendTyping, ensureUser }),
      ),
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
    expect(sendTyping).toHaveBeenCalledWith(42, "en");
    expect(order).toEqual(["typing", "ensure-user"]);
  });

  it("returns concise help and detailed import instructions", async () => {
    const parsed = parseTelegramUpdate(update("/help"));
    if (!parsed) throw new Error("Expected update to parse");
    const reply = await processTelegramUpdate(parsed, dependencies());
    expect(reply?.text).toContain("🎙 /speaking");
    expect(reply?.text).toContain("🧹 /reset");
    expect(reply?.text).toContain("— add phrases to your vocabulary");
    expect(reply?.text).toContain("— get your speaking task");
    expect(reply?.text).toContain("— remove all phrases from Learning");
    expect(reply?.followUps?.[0]?.text).toContain("<b>How to import</b>");
  });

  it("asks for a voice note when plain text arrives during an active speaking task", async () => {
    const parsed = parseTelegramUpdate(update("Here is my answer"));
    if (!parsed) throw new Error("Expected update to parse");
    const hasActiveSpeakingTask = vi.fn().mockResolvedValue(true);

    await expect(processTelegramUpdate(
      parsed,
      dependencies({ hasActiveSpeakingTask }),
    )).resolves.toEqual({
      chatId: 42,
      replyToMessageId: 7,
      text: "🎙️Send a voice message to complete your speaking task.",
    });
    expect(hasActiveSpeakingTask).toHaveBeenCalledWith(42, "en");
  });

  it("keeps help behavior for supported commands while a speaking task is active", async () => {
    const hasActiveSpeakingTask = vi.fn().mockResolvedValue(true);
    const help = parseTelegramUpdate(update("/help"));
    const malformedReset = parseTelegramUpdate(update("/reset confirm"));
    if (!help || !malformedReset) throw new Error("Expected updates to parse");

    const helpReply = await processTelegramUpdate(
      help,
      dependencies({ hasActiveSpeakingTask }),
    );
    const malformedResetReply = await processTelegramUpdate(
      malformedReset,
      dependencies({ hasActiveSpeakingTask }),
    );

    expect(helpReply?.text).toContain("Here’s what I can help with");
    expect(malformedResetReply?.text).toContain("Here’s what I can help with");
    expect(hasActiveSpeakingTask).not.toHaveBeenCalled();
  });

  it("treats an unsupported slash token as text during an active speaking task", async () => {
    const parsed = parseTelegramUpdate(update("/unknown"));
    if (!parsed) throw new Error("Expected update to parse");
    const hasActiveSpeakingTask = vi.fn().mockResolvedValue(true);

    await expect(processTelegramUpdate(
      parsed,
      dependencies({ hasActiveSpeakingTask }),
    )).resolves.toMatchObject({
      text: "🎙️Send a voice message to complete your speaking task.",
    });
    expect(hasActiveSpeakingTask).toHaveBeenCalledWith(42, "en");
  });

  it("keeps fallback help for plain text without an active speaking task", async () => {
    const parsed = parseTelegramUpdate(update("Hello"));
    if (!parsed) throw new Error("Expected update to parse");
    const hasActiveSpeakingTask = vi.fn().mockResolvedValue(false);

    const reply = await processTelegramUpdate(
      parsed,
      dependencies({ hasActiveSpeakingTask }),
    );

    expect(reply?.text).toContain("Here’s what I can help with");
    expect(reply?.followUps?.[0]?.text).toContain("<b>How to import</b>");
  });

  it("guides an empty import without treating it as a validation error", async () => {
    const parsed = parseTelegramUpdate(update("/import"));
    if (!parsed) throw new Error("Expected update to parse");
    const importItems = vi.fn();

    await expect(
      processTelegramUpdate(parsed, dependencies({ importItems })),
    ).resolves.toMatchObject({
      text:
        "📥 Ready to add some phrases?\n\n" +
        "Send everything in one message using this format:\n" +
        "/import\n" +
        "• phrase — description\n" +
        "• phrase — description\n\n" +
        "☝️A few rules:\n" +
        "• A phrase can’t be longer than 35 characters\n" +
        "• A description can’t be longer than 45 characters\n" +
        "• You can import up to 50 phrases at a time\n\n" +
        "💡 <b>Tip:</b> ChatGPT can generate and format this list for you. " +
        "Just paste this message into ChatGPT and ask it to follow the formatting rules.",
      parseMode: "HTML",
    });
    expect(importItems).not.toHaveBeenCalled();
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
    expect(malformedReply?.text).toContain("⚠️");
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
