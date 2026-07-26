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
        "/import\n- leisurely - relaxed\n• urge - desire\n* figure out - understand",
      ),
    );
    if (!parsed) throw new Error("Expected update to parse");

    await expect(
      processTelegramUpdate(parsed, { importItems, resetItems }),
    ).resolves.toEqual({
      chatId: 42,
      replyToMessageId: 7,
      text: "Imported 3 phrases.",
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
      "Use this format:\n/import\nphrase - description",
    );
    expect(malformedReply?.text).toContain(
      "ask ChatGPT to convert your vocabulary",
    );

    const validationReply = await processTelegramUpdate(invalid, {
      importItems,
      resetItems,
    });
    expect(validationReply?.text).toContain("Nothing was imported");
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
  });

  it("hard-resets through the reset workflow", async () => {
    const importItems = vi.fn();
    const resetItems = vi.fn().mockResolvedValue(undefined);
    const parsed = parseTelegramUpdate(update("/reset@MementoBot"));
    if (!parsed) throw new Error("Expected update to parse");

    await expect(
      processTelegramUpdate(parsed, { importItems, resetItems }),
    ).resolves.toMatchObject({ text: "Vocabulary reset." });
    expect(resetItems).toHaveBeenCalledWith(
      expect.objectContaining({ id: 42 }),
    );
  });

  it("ignores groups, unrelated text, and unsupported update kinds", async () => {
    const dependencies = {
      importItems: vi.fn(),
      resetItems: vi.fn(),
    };
    const group = parseTelegramUpdate(update("/reset", "group"));
    const unrelated = parseTelegramUpdate(update("hello"));
    const unsupported = parseTelegramUpdate({ update_id: 101 });
    if (!group || !unrelated || !unsupported) {
      throw new Error("Expected updates to parse");
    }

    await expect(
      processTelegramUpdate(group, dependencies),
    ).resolves.toBeNull();
    await expect(
      processTelegramUpdate(unrelated, dependencies),
    ).resolves.toBeNull();
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
