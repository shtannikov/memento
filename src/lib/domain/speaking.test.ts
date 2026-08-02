import { describe, expect, it } from "vitest";

import {
  computeSpeechStats,
  estimateCefrLevel,
  selectLeastPracticed,
} from "./speaking";

describe("speaking domain", () => {
  it("computes compact speech statistics", () => {
    expect(computeSpeechStats("Hello hello, world!", 30)).toEqual({
      duration_seconds: 30,
      word_count: 3,
      unique_word_count: 2,
      wpm: 6,
      ttr: 0.6667,
    });
  });

  it("maps rubric averages to CEFR levels", () => {
    expect(estimateCefrLevel({
      fluencyAndCoherence: 3,
      lexicalResource: 3,
      grammaticalRange: 3,
      grammaticalAccuracy: 3,
    })).toBe("B2");
  });

  it("selects only among the least-practiced options", () => {
    expect(
      ["a", "b"],
    ).toContain(selectLeastPracticed(["a", "b", "c"], ["c", "c"], "u:d"));
    expect(() => selectLeastPracticed([], [], "key")).toThrow();
  });
});
