import { describe, expect, it } from "vitest";

import {
  applyFirstAttemptResult,
  INITIAL_SCHEDULING_STATE,
} from "./scheduling";

describe("applyFirstAttemptResult", () => {
  it("marks an item learned after three consecutive correct reviews and 14 days", () => {
    const first = applyFirstAttemptResult(INITIAL_SCHEDULING_STATE, true);
    const second = applyFirstAttemptResult(first, true);
    const third = applyFirstAttemptResult(second, true);

    expect(first.intervalDays).toBe(1);
    expect(second.intervalDays).toBe(6);
    expect(third.intervalDays).toBeGreaterThanOrEqual(14);
    expect(third.consecutiveCorrect).toBe(3);
    expect(third.learned).toBe(true);
  });

  it("resets repetitions and the correctness streak after a failed review", () => {
    const reviewed = applyFirstAttemptResult(
      {
        repetitions: 4,
        consecutiveCorrect: 4,
        intervalDays: 30,
        easeFactor: 1.35,
      },
      false,
    );

    expect(reviewed).toEqual({
      repetitions: 0,
      consecutiveCorrect: 0,
      intervalDays: 1,
      easeFactor: 1.3,
      learned: false,
    });
  });
});
