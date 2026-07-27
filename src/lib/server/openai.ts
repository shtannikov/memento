import "server-only";

import { createHash } from "node:crypto";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

import { AppError } from "./api";

export type GenerationVocabularyItem = {
  id: string;
  term: string;
  definition: string;
};

export type GeneratedQuizCard = {
  vocabularyId: string;
  sentence: string;
  answer: string;
  options: string[];
};

export type RecentQuizSentence = {
  vocabularyId: string;
  sentence: string;
};

const QuizRoundSchema = z.object({
  cards: z.array(
    z.object({
      vocabularyId: z.string(),
      sentence: z.string(),
      answer: z.string(),
      options: z.array(z.string()),
    }),
  ),
});

const QuizGradeSchema = z.object({
  evaluations: z.array(
    z.object({
      vocabularyId: z.string(),
      englishSentence: z.boolean(),
      meaningAligned: z.boolean(),
      idiomaticAnswer: z.boolean(),
      singleCorrectOption: z.boolean(),
      unambiguous: z.boolean(),
      definitionHidden: z.boolean(),
    }),
  ),
  passed: z.boolean(),
});

let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (client) return client;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new AppError("SERVER_NOT_CONFIGURED", "Quiz generation is not configured.", 503);
  client = new OpenAI({ apiKey });
  return client;
}

export function buildQuizPrompt(
  items: GenerationVocabularyItem[],
  recentSentences: RecentQuizSentence[] = [],
): string {
  return [
    "Create one English multiple-choice vocabulary card for every supplied item.",
    "The target is always English. Its definition may be in any language, including Russian; use it only as semantic guidance.",
    "Each sentence must contain the exact blank marker ___ once. Replacing ___ with answer must produce a complete, natural English sentence.",
    "The displayed answer may be a grammatically inflected form of the canonical target.",
    "For dictionary phrases beginning with 'to', omit or inflect the infinitive marker when the sentence requires it.",
    "In dictionary phrases, 'sth' is only an object placeholder. Never display the literal text 'sth'; put the concrete object in the sentence outside the blank whenever possible.",
    "The four options must be four distinct displayed forms derived from targets in this input whenever possible.",
    "Test all four options by replacing ___ with each option. Exactly one option must produce grammatical, idiomatic English that makes sense in the context; the other three must be clearly wrong, not merely less likely.",
    "Respect each expression's required complements and fixed usage. Put concrete objects outside the blank when a transitive expression needs one (for example, '___ my coat' for 'put on'). Do not add an object after an expression that already contains it (for example, write '___ because my clothes are muddy' for 'do the laundry', never '___ all my muddy clothes').",
    "For discourse connectors, make the logical relation specific enough that no other connector option can reasonably fit.",
    "Do not translate, reveal, or quote definitions in sentences.",
    "Create fresh situations and wording. For each vocabularyId, do not reuse or closely paraphrase any of its recentSentences.",
    "Return every vocabularyId exactly once and do not add items.",
    JSON.stringify({ items, recentSentences }),
  ].join("\n");
}

export async function generateQuizCards(
  items: GenerationVocabularyItem[],
  userId: number,
  openai = getOpenAIClient(),
  recentSentences: RecentQuizSentence[] = [],
): Promise<GeneratedQuizCard[]> {
  let forbiddenSentences = recentSentences;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await requestQuizCards(
      items,
      userId,
      forbiddenSentences,
      openai,
    );
    try {
      const cards = validateGeneratedCards(
        items,
        response.output_parsed.cards,
        forbiddenSentences,
      );
      const grade = await gradeQuizCards(items, cards, openai);
      validateQuizGrade(items, grade);
      return cards;
    } catch {
      if (attempt === 1) throw invalidGeneration();
      forbiddenSentences = [
        ...forbiddenSentences,
        ...response.output_parsed.cards.map((card) => ({
          vocabularyId: card.vocabularyId,
          sentence: card.sentence,
        })),
      ];
    }
  }

  throw invalidGeneration();
}

export function validateGeneratedCards(
  items: GenerationVocabularyItem[],
  cards: GeneratedQuizCard[],
  recentSentences: RecentQuizSentence[] = [],
): GeneratedQuizCard[] {
  if (cards.length !== items.length) {
    throw invalidGeneration();
  }

  const expectedIds = new Set(items.map((item) => item.id));
  const seen = new Set<string>();
  for (const card of cards) {
    if (!expectedIds.has(card.vocabularyId) || seen.has(card.vocabularyId)) {
      throw invalidGeneration();
    }
    seen.add(card.vocabularyId);

    const blankCount = card.sentence.split("___").length - 1;
    const normalizedOptions = card.options.map((option) =>
      option.trim().toLocaleLowerCase(),
    );
    const normalizedAnswer = card.answer.trim().toLocaleLowerCase();
    if (
      blankCount !== 1 ||
      card.options.length !== 4 ||
      new Set(normalizedOptions).size !== 4 ||
      normalizedOptions.filter((option) => option === normalizedAnswer)
        .length !== 1 ||
      card.sentence.trim().length < 8 ||
      recentSentences.some(
        (recent) =>
          recent.vocabularyId === card.vocabularyId &&
          areQuizSentencesTooSimilar(card.sentence, recent.sentence),
      )
    ) {
      throw invalidGeneration();
    }
  }
  return cards;
}

export async function gradeQuizCards(
  items: GenerationVocabularyItem[],
  cards: GeneratedQuizCard[],
  openai = getOpenAIClient(),
): Promise<z.infer<typeof QuizGradeSchema>> {
  const response = await openai.responses.parse({
    model: process.env.OPENAI_CHAT_MODEL ?? "gpt-5.6-luna",
    reasoning: { effort: "low" },
    store: false,
    max_output_tokens: 2500,
    input: [
      {
        role: "system",
        content:
          "Grade English vocabulary exercises strictly. For every card, replace ___ with each of its four options and assess the resulting complete sentences, not just the intended answer. The displayed answer may be an inflected form of the canonical target, and dictionary placeholders such as 'to' and 'sth' need not appear literally. Set idiomaticAnswer to false when the intended answer has a missing required complement, an extra or duplicated object, an unnatural collocation, or otherwise would not be used in that sentence. Set singleCorrectOption to true only when exactly one option is both grammatical and contextually reasonable; if another option could plausibly express the sentence's logic, it is false even when the intended answer seems slightly better. A pass requires every answer to be natural English, semantically aligned with its possibly non-English definition, the only correct option, unambiguous, and not to reveal or translate the definition.",
      },
      {
        role: "user",
        content: JSON.stringify({ items, cards }),
      },
    ],
    text: {
      format: zodTextFormat(QuizGradeSchema, "memento_quiz_grade"),
    },
  });
  if (response.status !== "completed" || !response.output_parsed) {
    throw new Error("Eval grader did not return a complete result");
  }
  return response.output_parsed;
}

export function validateQuizGrade(
  items: GenerationVocabularyItem[],
  grade: z.infer<typeof QuizGradeSchema>,
): void {
  const expectedIds = new Set(items.map((item) => item.id));
  const seen = new Set<string>();
  const evaluationsAreValid =
    grade.evaluations.length === items.length &&
    grade.evaluations.every((evaluation) => {
      if (
        !expectedIds.has(evaluation.vocabularyId) ||
        seen.has(evaluation.vocabularyId)
      ) {
        return false;
      }
      seen.add(evaluation.vocabularyId);
      return (
        evaluation.englishSentence &&
        evaluation.meaningAligned &&
        evaluation.idiomaticAnswer &&
        evaluation.singleCorrectOption &&
        evaluation.unambiguous &&
        evaluation.definitionHidden
      );
    });

  if (!grade.passed || !evaluationsAreValid) {
    throw invalidGeneration();
  }
}

export function normalizeQuizSentence(sentence: string): string {
  return sentence
    .normalize("NFKC")
    .toLocaleLowerCase("en")
    .replaceAll("___", " blank ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function areQuizSentencesTooSimilar(
  candidate: string,
  recent: string,
): boolean {
  const normalizedCandidate = normalizeQuizSentence(candidate);
  const normalizedRecent = normalizeQuizSentence(recent);
  if (normalizedCandidate === normalizedRecent) return true;

  const candidateTokens = new Set(normalizedCandidate.split(" "));
  const recentTokens = new Set(normalizedRecent.split(" "));
  const smallerSize = Math.min(candidateTokens.size, recentTokens.size);
  if (smallerSize < 5) return false;

  let sharedTokens = 0;
  for (const token of candidateTokens) {
    if (recentTokens.has(token)) sharedTokens += 1;
  }
  return sharedTokens / smallerSize >= 0.8;
}

async function requestQuizCards(
  items: GenerationVocabularyItem[],
  userId: number,
  recentSentences: RecentQuizSentence[],
  openai: OpenAI,
) {
  try {
    const response = await openai.responses.parse({
      model: process.env.OPENAI_CHAT_MODEL ?? "gpt-5.6-luna",
      reasoning: { effort: "low" },
      store: false,
      max_output_tokens: 4000,
      safety_identifier: createHash("sha256")
        .update(`memento:${userId}`)
        .digest("hex"),
      input: [
        {
          role: "system",
          content:
            "You create unambiguous English vocabulary exercises and follow the output schema exactly.",
        },
        { role: "user", content: buildQuizPrompt(items, recentSentences) },
      ],
      text: {
        format: zodTextFormat(QuizRoundSchema, "memento_quiz_round"),
      },
    });
    if (response.status !== "completed" || !response.output_parsed) {
      throw invalidGeneration();
    }
    return {
      output_parsed: response.output_parsed,
    };
  } catch {
    throw invalidGeneration();
  }
}

function invalidGeneration(): AppError {
  return new AppError(
    "GENERATION_FAILED",
    "Couldn’t prepare this quiz. Please try again.",
    502,
  );
}
