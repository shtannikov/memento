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
  it("renders an HTML task card without a separate topic title", () => {
    const message = buildSpeakingTaskMessage(task);
    expect(message).toContain("Your new speaking task");
    expect(message).toContain("The scene");
    expect(message).not.toContain(task.topic);
    expect(message).toContain("<i>take into account</i>");
    expect(message).toContain("send a 1–3 minute voice note");
  });

  it("celebrates an answer that needs no corrections", () => {
    const evaluation: AnswerEvaluation = {
      coverageScore: 100,
      substantiveSpeech: true,
      corrections: [],
      requiredPhraseUsage: [{
        vocabularyId: "1",
        phrase: "take into account",
        status: "used_correctly",
        matchedText: "take it into account",
      }],
      grammarPriority: null,
      telegramFeedback: "Excellent work.",
    };

    const message = buildSpeakingFeedbackMessage(
      "I always take it into account.",
      evaluation,
    );

    expect(message).toContain(
      "<b>You nailed it 👏 I wouldn’t change a thing! Here’s your answer:</b>",
    );
    expect(message).not.toContain("transcript");
    expect(message).not.toContain("A few things I’d fix");
  });

  it("renders corrections inline and omits quick stats", () => {
    const evaluation: AnswerEvaluation = {
      coverageScore: 80,
      substantiveSpeech: true,
      corrections: [{
        category: "grammar",
        original: "took",
        corrected: "have taken",
        why: "Use the present perfect for a recent result.",
        severity: 4,
      }],
      requiredPhraseUsage: [{
        vocabularyId: "1",
        phrase: "take into account",
        status: "used_correctly",
        matchedText: "took it into account",
      }],
      grammarPriority: null,
      telegramFeedback: "Good work.",
    };
    const message = buildSpeakingFeedbackMessage(
      "I took it into account.",
      evaluation,
    );
    expect(message).toContain("Nice work 👏 A few things I’d fix:");
    expect(message).not.toContain("You nailed it");
    expect(message).toContain(
      "<blockquote expandable>I <u><s>took</s> <b>have taken</b></u><u> it into account</u>.</blockquote>",
    );
    expect(message).not.toContain("Corrections");
    expect(message).not.toContain("Quick stats");
    expect(message).not.toContain("Speaking pace");
    expect(message).not.toContain("Estimated level");
    expect(message).not.toContain("phrases to try next");
  });

  it("underlines every spoken phrase and keeps corrections visible", () => {
    const evaluation: AnswerEvaluation = {
      coverageScore: 100,
      substantiveSpeech: true,
      corrections: [{
        category: "grammar",
        original: "responsible of",
        corrected: "responsible for",
        why: "Use responsible for.",
        severity: 3,
      }],
      requiredPhraseUsage: [
        {
          vocabularyId: "1",
          phrase: "to take sth into account",
          status: "used_correctly",
          matchedText: "took the deadline into account",
        },
        {
          vocabularyId: "2",
          phrase: "to be responsible for sth",
          status: "used_incorrectly",
          matchedText: "responsible of the report",
        },
        {
          vocabularyId: "3",
          phrase: "to wrap up sth",
          status: "used_correctly",
          matchedText: "wrapped up the meeting",
        },
      ],
      grammarPriority: {
        explanation: "Use the preposition for after responsible.",
        example: "I am responsible for the report.",
      },
      telegramFeedback: "Keep going.",
    };

    const message = buildSpeakingFeedbackMessage(
      "I took the deadline into account, was responsible of the report, and wrapped up the meeting.",
      evaluation,
    );

    expect(message).toContain("<u>took the deadline into account</u>");
    expect(message).toContain(
      "<u>responsible <s>of</s> <b>for</b></u>",
    );
    expect(message).toContain("<u> the report</u>");
    expect(message).toContain("<u>wrapped up the meeting</u>");
    expect(message).toContain(
      "One grammar pattern to fix:</b>\nUse the preposition for after responsible.",
    );
    expect(message).not.toContain("<b>Use the preposition");
  });

  it("returns only the not-counted message for a non-substantive phrase list", () => {
    const evaluation: AnswerEvaluation = {
      coverageScore: 100,
      substantiveSpeech: false,
      corrections: [],
      requiredPhraseUsage: [{
        vocabularyId: "1",
        phrase: "take into account",
        status: "used_incorrectly",
        matchedText: "take into account",
      }],
      grammarPriority: null,
      telegramFeedback: "Use the phrases in connected speech.",
    };

    const message = buildSpeakingFeedbackMessage(
      "First, take into account means consider.",
      evaluation,
    );

    expect(message).toBe(
      "To practice these phrases effectively, use them to tell a short story, share an opinion, or describe something. Just listing them isn’t enough, so I can’t count this attempt yet 🙁",
    );
  });
});
