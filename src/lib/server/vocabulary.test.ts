// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getMementoDb: vi.fn(),
}));

vi.mock("./supabase", () => ({
  getMementoDb: mocks.getMementoDb,
}));

import { loadVocabulary } from "./vocabulary";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("loadVocabulary", () => {
  it("loads Learning progress and orders Practicing by speaking rank", async () => {
    const vocabularyQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          { id: 1, term: "learn", definition: "definition", status: "learning" },
          { id: 2, term: "later", definition: "definition", status: "practicing" },
          { id: 3, term: "first", definition: "definition", status: "practicing" },
        ],
        error: null,
      }),
    };
    const speakingQuery = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: [
          { vocabulary_id: 2, correct_uses: 2, practice_rank: 2048 },
          { vocabulary_id: 3, correct_uses: 1, practice_rank: 1024 },
        ],
        error: null,
      }),
    };
    const schedulingQuery = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: [{ vocabulary_id: 1, consecutive_correct: 2 }],
        error: null,
      }),
    };
    const from = vi.fn((table: string) => {
      if (table === "vocabulary_items") return vocabularyQuery;
      if (table === "speaking_states") return speakingQuery;
      return schedulingQuery;
    });
    mocks.getMementoDb.mockReturnValue({ from });

    const result = await loadVocabulary(42, "en");

    expect(result.learning[0]).toMatchObject({
      id: "1",
      consecutiveCorrect: 2,
    });
    expect(result.practicing.map((item) => item.id)).toEqual(["3", "2"]);
    expect(result.practicing[0]).toMatchObject({
      correctUses: 1,
      practiceRank: 1024,
    });
  });
});
