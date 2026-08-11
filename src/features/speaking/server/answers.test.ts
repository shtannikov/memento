// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getMementoDb: vi.fn(),
  evaluateSpeakingAnswer: vi.fn(),
  transcribeVoice: vi.fn(),
  downloadTelegramFile: vi.fn(),
  getTelegramFile: vi.fn(),
  sendTelegramMessage: vi.fn(),
  sendTelegramTyping: vi.fn(),
}));
vi.mock("@/lib/server/supabase", () => ({ getMementoDb: mocks.getMementoDb }));
vi.mock("@/lib/server/openai", () => ({
  evaluateSpeakingAnswer: mocks.evaluateSpeakingAnswer,
  transcribeVoice: mocks.transcribeVoice,
}));
vi.mock("@/lib/server/telegram-bot", () => ({
  downloadTelegramFile: mocks.downloadTelegramFile,
  getTelegramFile: mocks.getTelegramFile,
  sendTelegramMessage: mocks.sendTelegramMessage,
  sendTelegramTyping: mocks.sendTelegramTyping,
}));

import { processSpeakingVoiceAnswer, validateVoiceDuration } from "./answers";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.sendTelegramTyping.mockResolvedValue(undefined);
});

describe("validateVoiceDuration", () => {
  it("accepts the inclusive supported range", () => {
    expect(() => validateVoiceDuration(30)).not.toThrow();
    expect(() => validateVoiceDuration(180)).not.toThrow();
  });

  it("rejects voice messages outside the supported range", () => {
    expect(() => validateVoiceDuration(29)).toThrow(
      "That voice message is too short 🤏\nKeep building your speaking skills and give it another try 💪\nSpeak for at least 30 seconds.",
    );
    expect(() => validateVoiceDuration(181)).toThrow(
      "Whoa! That voice message is too long 🙀\nPlease keep it under 3 minutes.",
    );
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
    ).rejects.toMatchObject({
      code: "TASK_STALE",
      message:
        "That speaking task is no longer active. If you have another active task, reply to it. Otherwise, send /speaking to get a new one.",
    });
    expect(mocks.transcribeVoice).not.toHaveBeenCalled();
    expect(mocks.evaluateSpeakingAnswer).not.toHaveBeenCalled();
  });

  it("keeps typing active while transcribing and evaluating an answer", async () => {
    const queries = [
      queryResult(null),
      queryResult({
        id: "task-1",
        status: "active",
        topic: "A decision",
        domain: "work and career",
        grammar_focus: "future plans and predictions",
        prompt: "Explain your decision.",
      }),
      queryResult([
        {
          vocabulary_id: 7,
          term_snapshot: "make up my mind",
          definition_snapshot: "decide",
        },
      ]),
    ];
    const rpc = vi.fn().mockResolvedValue({
      data: { alreadyCompleted: false },
      error: null,
    });
    mocks.getMementoDb.mockReturnValue({
      from: vi.fn(() => {
        const query = queries.shift();
        if (!query) throw new Error("Unexpected query");
        return query;
      }),
      rpc,
    });
    mocks.getTelegramFile.mockResolvedValue({ filePath: "voice/file.oga" });
    mocks.downloadTelegramFile.mockResolvedValue(new Uint8Array([1, 2, 3]));
    mocks.transcribeVoice.mockResolvedValue("I made up my mind.");
    mocks.evaluateSpeakingAnswer.mockResolvedValue({
      coverageScore: 100,
      substantiveSpeech: true,
      corrections: [],
      requiredPhraseUsage: [
        {
          vocabularyId: "7",
          phrase: "make up my mind",
          status: "used_correctly",
          matchedText: "made up my mind",
        },
      ],
      grammarPriority: null,
      telegramFeedback: "Good work.",
    });
    mocks.sendTelegramMessage.mockResolvedValue({ messageId: 21 });

    await expect(
      processSpeakingVoiceAnswer(
        {
          chatId: 42,
          userId: 42,
          messageId: 20,
          fileId: "voice",
          durationSeconds: 60,
        },
        "en",
      ),
    ).resolves.toBe("completed");

    expect(mocks.sendTelegramTyping).toHaveBeenCalledWith(42, "en");
    expect(mocks.transcribeVoice).toHaveBeenCalledWith(
      expect.objectContaining({ filename: "voice/file.oga" }),
      "en",
    );
    expect(mocks.evaluateSpeakingAnswer).toHaveBeenCalledOnce();
  });
});

function queryResult(data: unknown) {
  const response = { data, error: null };
  const query: Record<string, ReturnType<typeof vi.fn>> & {
    then?: (resolve: (value: typeof response) => unknown) => unknown;
  } = {};
  for (const method of ["select", "eq", "order", "limit"]) {
    query[method] = vi.fn(() => query);
  }
  query.maybeSingle = vi.fn(async () => response);
  query.then = (resolve) => Promise.resolve(resolve(response));
  return query;
}
