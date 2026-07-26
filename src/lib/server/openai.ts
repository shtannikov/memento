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

export function buildQuizPrompt(items: GenerationVocabularyItem[]): string {
  return [
    "Create one English multiple-choice vocabulary card for every supplied item.",
    "The target is always English. Its definition may be in any language, including Russian; use it only as semantic guidance.",
    "Each sentence must contain the exact blank marker ___ once. Replacing ___ with answer must produce a complete, natural English sentence.",
    "The displayed answer may be a grammatically inflected form of the canonical target.",
    "For dictionary phrases beginning with 'to', omit or inflect the infinitive marker when the sentence requires it.",
    "In dictionary phrases, 'sth' is only an object placeholder. Never display the literal text 'sth'; put the concrete object in the sentence outside the blank whenever possible.",
    "Example: target 'to wrap up sth' may become sentence \"Let's ___ the meeting before lunch.\" and answer 'wrap up'.",
    "Example: target 'to be in charge of sth' may become sentence 'Maya will ___ the event.' and answer 'be in charge of'.",
    "The four options must be four distinct displayed forms derived from targets in this input whenever possible.",
    "Exactly one option must fit both the grammar and meaning of the sentence. Do not translate, reveal, or quote definitions in sentences.",
    "Return every vocabularyId exactly once and do not add items.",
    JSON.stringify({ items }),
  ].join("\n");
}

export async function generateQuizCards(
  items: GenerationVocabularyItem[],
  userId: number,
  openai = getOpenAIClient(),
): Promise<GeneratedQuizCard[]> {
  let response;
  try {
    response = await openai.responses.parse({
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
        { role: "user", content: buildQuizPrompt(items) },
      ],
      text: {
        format: zodTextFormat(QuizRoundSchema, "memento_quiz_round"),
      },
    });
  } catch {
    throw new AppError(
      "GENERATION_FAILED",
      "Couldn’t prepare this quiz. Please try again.",
      502,
    );
  }

  if (response.status !== "completed" || !response.output_parsed) {
    throw new AppError(
      "GENERATION_FAILED",
      "Couldn’t prepare this quiz. Please try again.",
      502,
    );
  }

  return validateGeneratedCards(items, response.output_parsed.cards);
}

export function validateGeneratedCards(
  items: GenerationVocabularyItem[],
  cards: GeneratedQuizCard[],
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
      card.sentence.trim().length < 8
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
          "Grade English vocabulary exercises strictly. Judge grammar after replacing ___ with the displayed answer. The displayed answer may be an inflected form of the canonical target, and dictionary placeholders such as 'to' and 'sth' need not appear literally. A pass requires every filled sentence to be natural English, semantically aligned with its possibly non-English definition, unambiguous, and not to reveal or translate the definition.",
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

function invalidGeneration(): AppError {
  return new AppError(
    "GENERATION_FAILED",
    "Couldn’t prepare this quiz. Please try again.",
    502,
  );
}
