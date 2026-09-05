import { describe, expect, it } from "vitest";

import { currentTrial } from "./current-trial";

describe("currentTrial", () => {
  it("publishes one fixed ten-card Czech Trial", () => {
    expect(currentTrial.id).toBe("2026-w36");
    expect(currentTrial.languageId).toBe("cz");
    expect(currentTrial.episodeIds).toHaveLength(7);
    expect(currentTrial.cards).toHaveLength(10);
    expect(new Set(currentTrial.cards.map((card) => card.id)).size).toBe(10);
  });
});
