// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getMementoDb: vi.fn(),
  evaluateSpeakingAnswer: vi.fn(),
  transcribeVoice: vi.fn(),
}));
vi.mock("../supabase", () => ({ getMementoDb: mocks.getMementoDb }));
vi.mock("../openai", () => ({
  evaluateSpeakingAnswer: mocks.evaluateSpeakingAnswer,
  transcribeVoice: mocks.transcribeVoice,
}));
vi.mock("../telegram-bot", () => ({
  downloadTelegramFile: vi.fn(),
  getTelegramFile: vi.fn(),
  sendTelegramMessage: vi.fn(),
  sendTelegramTyping: vi.fn(),
}));

import { processSpeakingVoiceAnswer, validateVoiceDuration } from "./answers";

beforeEach(() => vi.clearAllMocks());

describe("validateVoiceDuration", () => {
  it("accepts the inclusive supported range", () => {
    expect(() => validateVoiceDuration(30)).not.toThrow();
    expect(() => validateVoiceDuration(180)).not.toThrow();
  });

  it("rejects voice notes outside the supported range", () => {
    expect(() => validateVoiceDuration(29)).toThrow("at least 30 seconds");
    expect(() => validateVoiceDuration(181)).toThrow("under 3 minutes");
  });
});

describe("speaking answer task resolution", () => {
  it("does not fall back to another task when a reply target is stale", async () => {
    const queries = [queryResult(null), queryResult(null)];
    mocks.getMementoDb.mockReturnValue({
      from: vi.fn(() => {
        const query = queries.shift();
        if (!query) throw new Error("Unexpected query");
        return query;
      }),
    });

    await expect(
      processSpeakingVoiceAnswer(
        {
          chatId: 42,
          userId: 42,
          messageId: 20,
          replyToMessageId: 9,
          fileId: "voice",
          durationSeconds: 60,
        },
        "en",
      ),
    ).rejects.toMatchObject({ code: "TASK_STALE" });
    expect(mocks.transcribeVoice).not.toHaveBeenCalled();
    expect(mocks.evaluateSpeakingAnswer).not.toHaveBeenCalled();
  });
});

function queryResult(data: unknown) {
  const response = { data, error: null };
  const query: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of ["select", "eq"]) {
    query[method] = vi.fn(() => query);
  }
  query.maybeSingle = vi.fn(async () => response);
  return query;
}
