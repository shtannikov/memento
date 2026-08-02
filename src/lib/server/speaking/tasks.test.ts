// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getMementoDb: vi.fn(),
  generateSpeakingTopic: vi.fn(),
  sendTelegramMessage: vi.fn(),
}));

vi.mock("../supabase", () => ({ getMementoDb: mocks.getMementoDb }));
vi.mock("../openai", () => ({
  generateSpeakingTopic: mocks.generateSpeakingTopic,
}));
vi.mock("../telegram-bot", () => ({
  sendTelegramMessage: mocks.sendTelegramMessage,
}));

import { getOrCreateSpeakingTask, runSpeakingTaskCommand } from "./tasks";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("speaking task workflow", () => {
  it("returns an existing active task without calling topic generation", async () => {
    mocks.getMementoDb.mockReturnValue(database([
      result({
        id: "task-1",
        status: "active",
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

    expect(response).toMatchObject({ existing: true, needsDelivery: false });
    expect(response.task.items[0]?.term).toBe("make up my mind");
    expect(mocks.generateSpeakingTopic).not.toHaveBeenCalled();
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
        status: "active",
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
    expect(db.from).toHaveBeenCalledWith("speaking_task_messages");
    expect(db.queries[2]?.insert).toHaveBeenCalledWith({
      task_id: "task-1",
      chat_id: 42,
      message_id: 91,
    });
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
