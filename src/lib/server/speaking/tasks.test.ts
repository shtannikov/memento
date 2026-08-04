// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getMementoDb: vi.fn(),
  generateSpeakingTopic: vi.fn(),
  deleteTelegramMessage: vi.fn(),
  sendTelegramMessage: vi.fn(),
  sendTelegramTyping: vi.fn(),
}));

vi.mock("../supabase", () => ({ getMementoDb: mocks.getMementoDb }));
vi.mock("../openai", () => ({
  generateSpeakingTopic: mocks.generateSpeakingTopic,
}));
vi.mock("../telegram-bot", () => ({
  deleteTelegramMessage: mocks.deleteTelegramMessage,
  sendTelegramMessage: mocks.sendTelegramMessage,
  sendTelegramTyping: mocks.sendTelegramTyping,
}));

import {
  getOrCreateSpeakingTask,
  runSpeakingTaskCommand,
} from "./tasks";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.sendTelegramTyping.mockResolvedValue(undefined);
});

describe("speaking task workflow", () => {
  it("returns an existing ready task without calling topic generation", async () => {
    mocks.getMementoDb.mockReturnValue(database([
      result({
        id: "task-1",
        status: "ready",
        topic: "A difficult decision",
        domain: "personal decisions",
        grammar_focus: "future plans and predictions",
        prompt: "Explain the choice and what will happen next.",
      }, "single"),
      result([
        {
          vocabulary_id: 11,
          term_snapshot: "make up my mind",
          definition_snapshot: "decide",
        },
      ]),
    ]));

    const response = await getOrCreateSpeakingTask(42, "en");

    expect(response).toMatchObject({ existing: true, needsDelivery: true });
    expect(response.task.items[0]?.term).toBe("make up my mind");
    expect(mocks.generateSpeakingTopic).not.toHaveBeenCalled();
  });

  it("regenerates an active task from the latest Practicing priorities", async () => {
    const db = database([
      result({
        id: "task-old",
        status: "active",
        topic: "Old topic",
        domain: "old domain",
        grammar_focus: "old grammar",
        prompt: "Old prompt",
      }, "single"),
      result(null, "count", 1),
      result([
        { id: 22, term: "new priority", definition: "new definition" },
        { id: 11, term: "old priority", definition: "old definition" },
      ]),
      result([
        { vocabulary_id: 11, practice_rank: 2048 },
        { vocabulary_id: 22, practice_rank: 1024 },
      ]),
      result(null),
      result({ id: "task-new" }, "single"),
      result(null),
      result([]),
      result(null),
    ]);
    mocks.getMementoDb.mockReturnValue(db);
    mocks.generateSpeakingTopic.mockResolvedValue({
      title: "New topic",
      domain: "work",
      grammarFocus: "conditionals",
      speakingPrompt: "Discuss the new priority.",
    });

    const response = await getOrCreateSpeakingTask(42, "en");

    expect(response).toMatchObject({
      existing: false,
      needsDelivery: true,
      supersededTaskId: "task-old",
      task: {
        id: "task-new",
      },
    });
    expect(response.task.items[0]).toMatchObject({
      vocabularyId: "22",
      term: "new priority",
    });
    expect(db.queries[4]?.update).toHaveBeenCalledWith({
      status: "superseded",
    });
    expect(mocks.generateSpeakingTopic).toHaveBeenCalledWith(
      expect.objectContaining({ requiredPhrases: ["new priority", "old priority"] }),
      42,
      "en",
    );
  });

  it("keeps the active task when the daily generation limit is reached", async () => {
    mocks.getMementoDb.mockReturnValue(database([
      result({
        id: "task-old",
        status: "active",
        topic: "Old topic",
        domain: "old domain",
        grammar_focus: "old grammar",
        prompt: "Old prompt",
      }, "single"),
      result(null, "count", 5),
    ]));

    await expect(getOrCreateSpeakingTask(42, "en")).rejects.toMatchObject({
      code: "DAILY_SPEAKING_LIMIT",
    });
    expect(mocks.generateSpeakingTopic).not.toHaveBeenCalled();
  });

  it("delivers a regenerated task before deleting the obsolete message", async () => {
    const db = database([
      result({
        id: "task-old",
        status: "active",
        topic: "Old topic",
        domain: "old domain",
        grammar_focus: "old grammar",
        prompt: "Old prompt",
      }, "single"),
      result(null, "count", 1),
      result([{ id: 22, term: "new priority", definition: "definition" }]),
      result([{ vocabulary_id: 22, practice_rank: 1024 }]),
      result(null),
      result({ id: "task-new" }, "single"),
      result(null),
      result([]),
      result(null),
      result(null),
      result(null),
      result([{ message_id: 88 }]),
    ]);
    mocks.getMementoDb.mockReturnValue(db);
    mocks.generateSpeakingTopic.mockResolvedValue({
      title: "New topic",
      domain: "work",
      grammarFocus: "conditionals",
      speakingPrompt: "Discuss the new priority.",
    });
    mocks.sendTelegramMessage.mockResolvedValue({ messageId: 99 });
    mocks.deleteTelegramMessage.mockResolvedValue(undefined);

    await expect(runSpeakingTaskCommand(42, "en", 42)).resolves.toBe("created");

    expect(mocks.sendTelegramMessage).toHaveBeenCalledOnce();
    expect(mocks.deleteTelegramMessage).toHaveBeenCalledWith(42, 88, "en");
    expect(
      mocks.sendTelegramMessage.mock.invocationCallOrder[0],
    ).toBeLessThan(mocks.deleteTelegramMessage.mock.invocationCallOrder[0]);
  });

  it("restores the old active task when regeneration fails", async () => {
    const db = database([
      result({
        id: "task-old",
        status: "active",
        topic: "Old topic",
        domain: "old domain",
        grammar_focus: "old grammar",
        prompt: "Old prompt",
      }, "single"),
      result(null, "count", 1),
      result([{ id: 22, term: "new priority", definition: "definition" }]),
      result([{ vocabulary_id: 22, practice_rank: 1024 }]),
      result(null),
      result({ id: "task-new" }, "single"),
      result(null),
      result([]),
      result(null),
      result(null),
    ]);
    mocks.getMementoDb.mockReturnValue(db);
    mocks.generateSpeakingTopic.mockRejectedValue(new Error("generation failed"));

    await expect(getOrCreateSpeakingTask(42, "en")).rejects.toThrow(
      "generation failed",
    );

    expect(db.queries[8]?.update).toHaveBeenCalledWith({ status: "failed" });
    expect(db.queries[9]?.update).toHaveBeenCalledWith({ status: "active" });
    expect(db.queries[9]?.eq).toHaveBeenCalledWith("status", "superseded");
  });

  it("does not call the model when Practicing is empty", async () => {
    mocks.getMementoDb.mockReturnValue(database([
      result(null, "single"),
      result(null, "count", 0),
      result([]),
    ]));

    await expect(getOrCreateSpeakingTask(42, "en")).rejects.toMatchObject({
      code: "NO_PRACTICING_ITEMS",
      message:
        "🎙 Nothing in Practicing yet. Keep reviewing your Learning phrases in quizzes, or tap Done in the App to move one to Practicing.",
    });
    expect(mocks.generateSpeakingTopic).not.toHaveBeenCalled();
  });

  it("resends an open task and stores the new exact Telegram mapping", async () => {
    const db = database([
      result({
        id: "task-1",
        status: "ready",
        topic: "A difficult decision",
        domain: "personal decisions",
        grammar_focus: "future plans and predictions",
        prompt: "Explain the choice and what will happen next.",
      }, "single"),
      result([
        {
          vocabulary_id: 11,
          term_snapshot: "make up my mind",
          definition_snapshot: "decide",
        },
      ]),
      result(null),
      result(null),
    ]);
    mocks.getMementoDb.mockReturnValue(db);
    mocks.sendTelegramMessage.mockResolvedValue({ messageId: 91 });

    await expect(runSpeakingTaskCommand(42, "en", 42)).resolves.toBe("resent");

    expect(mocks.sendTelegramMessage).toHaveBeenCalledOnce();
    expect(mocks.sendTelegramTyping).toHaveBeenCalledWith(42, "en");
    expect(db.from).toHaveBeenCalledWith("speaking_task_messages");
    expect(db.queries[2]?.insert).toHaveBeenCalledWith({
      task_id: "task-1",
      chat_id: 42,
      message_id: 91,
    });
  });

  it("stops refreshing typing before sending the task message", async () => {
    vi.useFakeTimers();
    const db = database([
      result({
        id: "task-1",
        status: "ready",
        topic: "A difficult decision",
        domain: "personal decisions",
        grammar_focus: "future plans and predictions",
        prompt: "Explain the choice and what will happen next.",
      }, "single"),
      result([{
        vocabulary_id: 11,
        term_snapshot: "make up my mind",
        definition_snapshot: "decide",
      }]),
      result(null),
      result(null),
    ]);
    mocks.getMementoDb.mockReturnValue(db);
    mocks.sendTelegramMessage.mockImplementation(async () => {
      await vi.advanceTimersByTimeAsync(4000);
      return { messageId: 91 };
    });

    await expect(runSpeakingTaskCommand(42, "en", 42)).resolves.toBe("resent");

    expect(mocks.sendTelegramTyping).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});

function database(queries: ReturnType<typeof result>[]) {
  const queue = [...queries];
  return {
    queries,
    from: vi.fn(() => {
      const query = queue.shift();
      if (!query) throw new Error("Unexpected database query");
      return query;
    }),
  };
}

function result(
  data: unknown,
  terminal?: "single" | "count",
  count?: number,
) {
  const response = { data, error: null, count };
  const query: Record<string, ReturnType<typeof vi.fn>> & {
    then?: (resolve: (value: typeof response) => unknown) => unknown;
  } = {};
  for (const method of [
    "select",
    "eq",
    "in",
    "order",
    "limit",
    "insert",
    "update",
  ]) {
    query[method] = vi.fn(() => query);
  }
  query.maybeSingle = vi.fn(async () => response);
  query.single = vi.fn(async () => response);
  query.then = (resolve) => Promise.resolve(resolve(response));
  if (terminal === "single") query.maybeSingle = vi.fn(async () => response);
  if (terminal === "count") query.then = (resolve) => Promise.resolve(resolve(response));
  return query;
}
