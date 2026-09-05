import { describe, expect, it } from "vitest";

import { parseTrialQuizManifest } from "./trial-quiz-manifest";

function episodes() {
  return Array.from({ length: 7 }, (_, episodeIndex) => ({
    id: `episode-${episodeIndex + 1}`,
    languageId: "cz",
    items: Array.from({ length: 5 }, (_, itemIndex) => ({
      term: `term-${episodeIndex + 1}-${itemIndex + 1}`,
      slug: `item-${itemIndex + 1}`,
    })),
  }));
}

function manifest() {
  return {
    id: "2026-w36",
    languageId: "cz",
    episodeIds: episodes().map((episode) => episode.id),
    cards: Array.from({ length: 10 }, (_, index) => {
      const episodeIndex = index % 7;
      return {
        source: {
          episodeId: `episode-${episodeIndex + 1}`,
          itemSlug: `item-${Math.floor(index / 7) + 1}`,
        },
        sentence: `Sentence ${index + 1} with ___.`,
        answer: `answer-${index + 1}`,
        options: [
          `answer-${index + 1}`,
          `wrong-a-${index + 1}`,
          `wrong-b-${index + 1}`,
          `wrong-c-${index + 1}`,
        ],
      };
    }),
  };
}

describe("TrialQuizManifest", () => {
  it("parses ten cards backed by seven five-word episodes", () => {
    const parsed = parseTrialQuizManifest(manifest(), episodes());

    expect(parsed.cards).toHaveLength(10);
    expect(parsed.cards[0].id).toBe("episode-1/item-1");
    expect(new Set(parsed.cards.map((card) => card.source.episodeId)).size).toBe(
      7,
    );
  });

  it("rejects duplicate source words", () => {
    const source = episodes();
    source[1].items[0].term = source[0].items[0].term;

    expect(() => parseTrialQuizManifest(manifest(), source)).toThrow(
      "Trial source terms must be unique",
    );
  });

  it("rejects cards with an invalid blank or missing answer", () => {
    const invalidBlank = manifest();
    invalidBlank.cards[0].sentence = "No blank here.";
    expect(() => parseTrialQuizManifest(invalidBlank, episodes())).toThrow(
      "must contain ___ exactly once",
    );

    const missingAnswer = manifest();
    missingAnswer.cards[0].options[0] = "another-wrong-answer";
    expect(() => parseTrialQuizManifest(missingAnswer, episodes())).toThrow(
      "must contain its answer exactly once",
    );
  });

  it("rejects a fixed set that omits an episode", () => {
    const incomplete = manifest();
    incomplete.cards[6].source = {
      episodeId: "episode-1",
      itemSlug: "item-3",
    };

    expect(() => parseTrialQuizManifest(incomplete, episodes())).toThrow(
      "must cover every episode",
    );
  });
});
