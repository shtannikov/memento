import { describe, expect, it } from "vitest";

import { recordAnswer, ROUND_LIVES, type RoundProgress } from "./round";

type Card = { id: string };

function progress(): RoundProgress<Card> {
  return {
    queue: [{ id: "1" }, { id: "2" }],
    completedIds: [],
    firstAttempts: {},
    lives: ROUND_LIVES,
    mistakes: 0,
  };
}

describe("recordAnswer", () => {
  it("removes a correct card and records its first attempt", () => {
    const next = recordAnswer(progress(), true);
    expect(next.queue.map((card) => card.id)).toEqual(["2"]);
    expect(next.completedIds).toEqual(["1"]);
    expect(next.firstAttempts).toEqual({ "1": true });
  });

  it("returns an incorrect card unchanged to the queue tail", () => {
    const next = recordAnswer(progress(), false);
    expect(next.queue.map((card) => card.id)).toEqual(["2", "1"]);
    expect(next.firstAttempts).toEqual({ "1": false });
    expect(next.lives).toBe(2);
  });

  it("does not overwrite the first-attempt result on a later success", () => {
    const failed = recordAnswer(progress(), false);
    const secondCardDone = recordAnswer(failed, true);
    const retried = recordAnswer(secondCardDone, true);
    expect(retried.firstAttempts["1"]).toBe(false);
  });

  it("stops reordering after the third mistake", () => {
    const state = {
      ...progress(),
      lives: 1,
      mistakes: 2,
    };
    const next = recordAnswer(state, false);
    expect(next.lives).toBe(0);
    expect(next.queue).toEqual(state.queue);
  });
});
