import { describe, expect, it, vi } from "vitest";

import { randomizeQuizOptions } from "./quiz-options";

describe("quiz option randomization", () => {
  it("balances correct-answer positions across a round", () => {
    const cards = Array.from({ length: 10 }, (_, index) => ({
      id: String(index),
      answer: "correct",
      options: ["correct", "wrong one", "wrong two", "wrong three"],
    }));
    const randomIndex = vi.fn((maxExclusive: number) =>
      Math.floor(maxExclusive / 2),
    );

    const randomized = randomizeQuizOptions(cards, randomIndex);
    const correctPositions = randomized.map((card) =>
      card.options.indexOf(card.answer),
    );
    const counts = [0, 1, 2, 3].map(
      (position) =>
        correctPositions.filter((candidate) => candidate === position)
          .length,
    );

    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(
      1,
    );
    expect(new Set(correctPositions).size).toBe(4);
    expect(randomIndex).toHaveBeenCalled();
  });

  it("keeps exactly one answer and does not mutate generated cards", () => {
    const cards = [
      {
        answer: "  Correct ",
        options: ["wrong one", "CORRECT", "wrong two", "wrong three"],
      },
    ];
    const originalOptions = [...cards[0].options];

    const [randomized] = randomizeQuizOptions(cards, () => 0);

    expect(
      randomized.options.filter(
        (option) => option.trim().toLowerCase() === "correct",
      ),
    ).toHaveLength(1);
    expect(randomized.options).toHaveLength(4);
    expect(cards[0].options).toEqual(originalOptions);
    expect(randomized).not.toBe(cards[0]);
  });

  it("rejects a card whose options lost the correct answer", () => {
    expect(() =>
      randomizeQuizOptions(
        [
          {
            answer: "correct",
            options: ["one", "two", "three", "four"],
          },
        ],
        () => 0,
      ),
    ).toThrow("do not contain its answer");
  });
});
