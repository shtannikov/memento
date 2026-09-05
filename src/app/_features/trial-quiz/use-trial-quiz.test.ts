import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { TrialQuizCard } from "./trial-quiz.types";
import { createTrialRandomIndex, useTrialQuiz } from "./use-trial-quiz";

const cards: TrialQuizCard[] = Array.from({ length: 10 }, (_, index) => ({
  id: `episode/card-${index}`,
  source: { episodeId: "episode", itemSlug: `card-${index}` },
  sentence: `Sentence ${index} ___.`,
  answer: `answer-${index}`,
  options: [
    `answer-${index}`,
    `wrong-a-${index}`,
    `wrong-b-${index}`,
    `wrong-c-${index}`,
  ],
}));

describe("useTrialQuiz", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("completes the fixed ten-card Trial locally", () => {
    const { result } = renderHook(() => useTrialQuiz(cards));

    for (let index = 0; index < cards.length; index += 1) {
      act(() => result.current.chooseAnswer(result.current.activeCard!.answer));
      act(() => vi.runOnlyPendingTimers());
    }

    expect(result.current.phase).toBe("complete");
    expect(result.current.completedCount).toBe(10);
    expect(result.current.firstAttemptAccuracy).toBe(100);
    expect(result.current.mistakes).toBe(0);
  });

  it("fails on the third mistake and can restart", () => {
    const { result } = renderHook(() => useTrialQuiz(cards));

    for (let index = 0; index < 3; index += 1) {
      const wrong = result.current.activeCard!.options.find(
        (option) => option !== result.current.activeCard!.answer,
      )!;
      act(() => result.current.chooseAnswer(wrong));
      act(() => vi.runOnlyPendingTimers());
    }

    expect(result.current.phase).toBe("failed");
    expect(result.current.lives).toBe(0);
    expect(result.current.mistakes).toBe(3);

    act(() => result.current.restart());
    expect(result.current.phase).toBe("active");
    expect(result.current.lives).toBe(3);
    expect(result.current.mistakes).toBe(0);
    expect(result.current.completedCount).toBe(0);
  });

  it("uses a hydration-safe shuffle that changes between attempts", () => {
    const first = createTrialRandomIndex(cards, 0);
    const sameFirst = createTrialRandomIndex(cards, 0);
    const second = createTrialRandomIndex(cards, 1);
    const firstSequence = Array.from({ length: 8 }, () => first(10));

    expect(Array.from({ length: 8 }, () => sameFirst(10))).toEqual(
      firstSequence,
    );
    expect(Array.from({ length: 8 }, () => second(10))).not.toEqual(
      firstSequence,
    );
    expect(firstSequence.every((value) => value >= 0 && value < 10)).toBe(true);
  });
});
