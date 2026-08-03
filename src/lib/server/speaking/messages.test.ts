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

  it("renders corrections inline and omits quick stats", () => {
    const evaluation: AnswerEvaluation = {
      coverageScore: 80,
      taskRelevance: "on_topic",
      corrections: [{
        category: "grammar",
        original: "I took it into account",
        corrected: "I have taken it into account",
        why: "Use the present perfect for a recent result.",
        severity: 4,
      }],
      requiredPhraseUsage: [{
        vocabularyId: "1",
        phrase: "take into account",
        status: "used_correctly",
        evidence: "I took it into account.",
      }],
      grammarPriority: null,
      telegramFeedback: "Good work.",
    };
    const message = buildSpeakingFeedbackMessage(
      "I took it into account.",
      evaluation,
    );
    expect(message).toContain(
      "<blockquote expandable>I <s>took</s> <b>have taken</b> it into account.</blockquote>",
    );
    expect(message).not.toContain("Corrections");
    expect(message).not.toContain("Quick stats");
    expect(message).not.toContain("Speaking pace");
    expect(message).not.toContain("Estimated level");
    expect(message).not.toContain("phrases to try next");
  });
});
