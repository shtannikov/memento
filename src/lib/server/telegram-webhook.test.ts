import { describe, expect, it, vi } from "vitest";

import { AppError } from "./api";
import {
  parseTelegramUpdate,
  processTelegramUpdate,
} from "./telegram-webhook";

function update(text: string, type = "private") {
  return {
    update_id: 100,
    message: {
      message_id: 7,
      text,
      chat: { id: 42, type },
      from: {
        id: 42,
        first_name: "Ada",
        username: "ada",
      },
    },
  };
}

describe("Telegram webhook workflow", () => {
  it("parses valid updates and rejects malformed payloads", () => {
    expect(parseTelegramUpdate(update("/reset"))).not.toBeNull();
    expect(parseTelegramUpdate({ update_id: "bad" })).toBeNull();
  });

  it("imports a validated list and returns a reply target", async () => {
    const importItems = vi.fn().mockResolvedValue(3);
    const resetItems = vi.fn();
    const parsed = parseTelegramUpdate(
      update(
        "/import\n- leisurely - relaxed\n• urge — desire\n* figure out - understand",
      ),
    );
    if (!parsed) throw new Error("Expected update to parse");

    await expect(
      processTelegramUpdate(parsed, { importItems, resetItems }),
    ).resolves.toEqual({
      chatId: 42,
      replyToMessageId: 7,
      text: "✅ Imported 3 phrases!",
    });
    expect(importItems).toHaveBeenCalledWith(
      {
        id: 42,
        first_name: "Ada",
        last_name: undefined,
        username: "ada",
      },
      [
        { term: "leisurely", definition: "relaxed" },
        { term: "urge", definition: "desire" },
        { term: "figure out", definition: "understand" },
      ],
    );
  });

  it("uses the singular noun when one phrase is imported", async () => {
    const parsed = parseTelegramUpdate(
      update("/import\nleisurely - relaxed"),
    );
    if (!parsed) throw new Error("Expected update to parse");

    await expect(
      processTelegramUpdate(parsed, {
        importItems: vi.fn().mockResolvedValue(1),
        resetItems: vi.fn(),
      }),
    ).resolves.toMatchObject({ text: "✅ Imported 1 phrase!" });
  });

  it("returns validation and capacity errors without partial work", async () => {
    const importItems = vi.fn();
    const resetItems = vi.fn();
    const malformedCommand = parseTelegramUpdate(update("/import x"));
    const invalid = parseTelegramUpdate(
      update("/import\nvalid - definition\ninvalid"),
    );
    if (!malformedCommand || !invalid) {
      throw new Error("Expected updates to parse");
    }

    const malformedReply = await processTelegramUpdate(malformedCommand, {
      importItems,
      resetItems,
    });
    expect(malformedReply?.text).toContain(
      "Please use this format:\n/import\n• phrase - description",
    );
    expect(malformedReply?.text).toContain(
      "• A phrase can’t be longer than 35 characters",
    );
    expect(malformedReply?.text).toContain(
      "• A description can’t be longer than 45 characters",
    );
    expect(malformedReply?.text).toContain(
      "• You can import up to 50 phrases at a time",
    );
    expect(malformedReply?.text).toContain(
      "ask ChatGPT to convert your vocabulary",
    );

    const validationReply = await processTelegramUpdate(invalid, {
      importItems,
      resetItems,
    });
    expect(validationReply?.text).toContain(
      "⚠️ I couldn’t import that list.",
    );
    expect(importItems).not.toHaveBeenCalled();

    importItems.mockRejectedValue(
      new AppError("VOCABULARY_LIMIT_EXCEEDED", "full", 409),
    );
    const full = parseTelegramUpdate(update("/import\nvalid - definition"));
    if (!full) throw new Error("Expected update to parse");
    const capacityReply = await processTelegramUpdate(full, {
      importItems,
      resetItems,
    });
    expect(capacityReply?.text).toContain("up to 500 phrases");
    expect(capacityReply?.text).toContain("including Learned");
    expect(capacityReply?.text).toContain("📚 Your vocabulary is full");
  });

  it("hard-resets through the reset workflow", async () => {
    const importItems = vi.fn();
    const resetItems = vi.fn().mockResolvedValue(undefined);
    const parsed = parseTelegramUpdate(update("/reset@MementoBot"));
    if (!parsed) throw new Error("Expected update to parse");

    await expect(
      processTelegramUpdate(parsed, { importItems, resetItems }),
    ).resolves.toMatchObject({
      text: "🧹 Done! Your vocabulary has been reset.",
    });
    expect(resetItems).toHaveBeenCalledWith(
      expect.objectContaining({ id: 42 }),
    );
  });

  it("returns concise onboarding for the start command", async () => {
    const dependencies = {
      importItems: vi.fn(),
      resetItems: vi.fn(),
    };
    const parsed = parseTelegramUpdate(update("/start@MementoBot"));
    if (!parsed) throw new Error("Expected update to parse");

    await expect(
      processTelegramUpdate(parsed, dependencies),
    ).resolves.toEqual({
      chatId: 42,
      replyToMessageId: 7,
      text:
        "👋 Welcome to Memento!\n\n" +
        "Tap <b>App</b> below to get started 👇",
      parseMode: "HTML",
    });
    expect(dependencies.importItems).not.toHaveBeenCalled();
    expect(dependencies.resetItems).not.toHaveBeenCalled();
  });

  it("treats unsupported private text as help and ignores other updates", async () => {
    const dependencies = {
      importItems: vi.fn(),
      resetItems: vi.fn(),
    };
    const group = parseTelegramUpdate(update("/reset", "group"));
    const unrelated = parseTelegramUpdate(update("hello"));
    const explicitHelp = parseTelegramUpdate(update("/help"));
    const unsupported = parseTelegramUpdate({ update_id: 101 });
    if (!group || !unrelated || !explicitHelp || !unsupported) {
      throw new Error("Expected updates to parse");
    }

    await expect(
      processTelegramUpdate(group, dependencies),
    ).resolves.toBeNull();
    const helpReply = await processTelegramUpdate(unrelated, dependencies);
    expect(helpReply).toMatchObject({
      chatId: 42,
      replyToMessageId: 7,
      parseMode: "HTML",
    });
    expect(helpReply?.text).toBe(
      "👋 Hey there.\n\n" +
        "Looking for the main app? Tap the <b>App</b> button below.\n\n" +
        "And here’s what I can help with right here in chat:\n\n" +
        "📥 /import\n" +
        "Add phrases to your vocabulary.\n" +
        "Put /import on the first line, then add one phrase per line:\n" +
        "• phrase - description\n" +
        "• phrase — description\n\n" +
        "☝️ A few rules:\n" +
        "• A phrase can’t be longer than 35 characters\n" +
        "• A description can’t be longer than 45 characters\n" +
        "• You can import up to 50 phrases at a time\n\n" +
        "🧹 /reset\n" +
        "Delete all phrases from your vocabulary.",
    );
    await expect(
      processTelegramUpdate(explicitHelp, dependencies),
    ).resolves.toEqual(helpReply);
    expect(dependencies.importItems).not.toHaveBeenCalled();
    expect(dependencies.resetItems).not.toHaveBeenCalled();

    await expect(
      processTelegramUpdate(unsupported, dependencies),
    ).resolves.toBeNull();
  });

  it("surfaces unexpected processing errors for Telegram retry", async () => {
    const parsed = parseTelegramUpdate(update("/reset"));
    if (!parsed) throw new Error("Expected update to parse");
    const databaseError = new Error("database unavailable");

    await expect(
      processTelegramUpdate(parsed, {
        importItems: vi.fn(),
        resetItems: vi.fn().mockRejectedValue(databaseError),
      }),
    ).rejects.toBe(databaseError);
  });
});
