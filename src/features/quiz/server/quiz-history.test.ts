import { beforeEach, describe, expect, it, vi } from "vitest";

const { getMementoDb } = vi.hoisted(() => ({
  getMementoDb: vi.fn(),
}));

vi.mock("@/server/supabase", () => ({ getMementoDb }));

import {
  collectRecentQuizSentences,
  loadRecentQuizSentences,
} from "./quiz-history";

const items = [
  { id: "1", term: "urge", definition: "A sudden desire." },
  { id: "2", term: "leisurely", definition: "Relaxed and unhurried." },
];

describe("recent quiz history", () => {
  beforeEach(() => {
    getMementoDb.mockReset();
  });

  it("loads recent user rounds and only the selected vocabulary items", async () => {
    const roundsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [{ id: "round-2" }, { id: "round-1" }],
        error: null,
      }),
    };
    const cardsQuery = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          { vocabulary_id: 1, sentence: "She felt an ___ to leave." },
          { vocabulary_id: 2, sentence: "They enjoyed a ___ lunch." },
        ],
        error: null,
      }),
    };
    getMementoDb.mockReturnValue({
      from: vi.fn((table: string) =>
        table === "rounds" ? roundsQuery : cardsQuery,
      ),
    });

    await expect(loadRecentQuizSentences(42, items)).resolves.toEqual([
      { vocabularyId: "1", sentence: "She felt an ___ to leave." },
      { vocabularyId: "2", sentence: "They enjoyed a ___ lunch." },
    ]);
    expect(roundsQuery.eq).toHaveBeenCalledWith("user_id", 42);
    expect(roundsQuery.limit).toHaveBeenCalledWith(10);
    expect(cardsQuery.in).toHaveBeenNthCalledWith(1, "round_id", [
      "round-2",
      "round-1",
    ]);
    expect(cardsQuery.in).toHaveBeenNthCalledWith(2, "vocabulary_id", [
      "1",
      "2",
    ]);
  });

  it("skips the card query when the user has no previous rounds", async () => {
    const roundsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const from = vi.fn().mockReturnValue(roundsQuery);
    getMementoDb.mockReturnValue({ from });

    await expect(loadRecentQuizSentences(42, items)).resolves.toEqual([]);
    expect(from).toHaveBeenCalledTimes(1);
  });

  it("deduplicates cosmetic variants and keeps three sentences per item", () => {
    const cards = [
      { vocabulary_id: 1, sentence: "She felt an ___ to leave." },
      { vocabulary_id: 1, sentence: "SHE FELT AN ___ TO LEAVE!" },
      ...Array.from({ length: 6 }, (_, index) => ({
        vocabulary_id: 1,
        sentence: `Unique context ${index} contains an ___ today.`,
      })),
      { vocabulary_id: 2, sentence: "They enjoyed a ___ lunch." },
    ];

    const result = collectRecentQuizSentences(cards);
    expect(result.filter((item) => item.vocabularyId === "1")).toHaveLength(3);
    expect(result.filter((item) => item.vocabularyId === "2")).toEqual([
      { vocabularyId: "2", sentence: "They enjoyed a ___ lunch." },
    ]);
    expect(result).not.toContainEqual({
      vocabularyId: "1",
      sentence: "SHE FELT AN ___ TO LEAVE!",
    });
  });

  it("surfaces database errors", async () => {
    const databaseError = new Error("history unavailable");
    const roundsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: null, error: databaseError }),
    };
    getMementoDb.mockReturnValue({
      from: vi.fn().mockReturnValue(roundsQuery),
    });

    await expect(loadRecentQuizSentences(42, items)).rejects.toBe(
      databaseError,
    );
  });
});
