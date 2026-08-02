// @vitest-environment node

import { describe, expect, it } from "vitest";

import type { AnswerEvaluation, SpeakingTask } from "@/lib/domain/speaking";
import {
  buildSpeakingFeedbackMessage,
  buildSpeakingTaskMessage,
} from "./messages";

const task: SpeakingTask = {
  id: "task-1",
  topic: "A delayed train",
  domain: "travel and transport",
  grammarFocus: "polite requests and indirect questions",
  prompt: "Ask the station assistant what your options are.",
  items: [{ vocabularyId: "1", term: "take into account", definition: "consider" }],
};

describe("speaking messages", () => {
  it("renders an HTML task card with target phrases", () => {
    const message = buildSpeakingTaskMessage(task);
    expect(message).toContain("Your new speaking task");
    expect(message).toContain("<i>take into account</i>");
    expect(message).toContain("send a 1–3 minute voice note");
  });

  it("renders feedback without phrase recommendations", () => {
    const evaluation: AnswerEvaluation = {
      coverageScore: 80,
      taskRelevance: "on_topic",
      corrections: [],
      requiredPhraseUsage: [{
        vocabularyId: "1",
        phrase: "take into account",
        status: "used_correctly",
        evidence: "I took it into account.",
      }],
      rubric: {
        fluencyAndCoherence: 3,
        lexicalResource: 3,
        grammaticalRange: 3,
        grammaticalAccuracy: 3,
      },
      grammarPriority: null,
      telegramFeedback: "Good work.",
    };
    const message = buildSpeakingFeedbackMessage("I took it into account.", evaluation, { wpm: 90 });
    expect(message).toContain("Estimated level: B2");
    expect(message).not.toContain("phrases to try next");
  });
});
