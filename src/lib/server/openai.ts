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

type GeneratedQuizCardDraft = GeneratedQuizCard & {
  optionChecks: Array<{
    option: string;
    fits: boolean;
    visibleCue: string;
  }>;
};

const QuizRoundSchema = z.object({
  cards: z.array(
    z.object({
      vocabularyId: z.string(),
      sentence: z.string(),
      answer: z.string(),
      options: z.array(z.string()),
      optionChecks: z.array(
        z.object({
          option: z.string(),
          fits: z.boolean(),
          visibleCue: z.string(),
        }),
      ),
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
    "Preserve the target's argument structure. If the displayed answer requires an object or complement, include it outside the blank; never use the answer elliptically as though it meant a different intransitive expression.",
    "If the target already contains its object or complement, do not add a second object or incompatible continuation after the blank.",
    "For example, use 'I need to ___ my coat' for 'put on', never 'I need to ___ before we go outside'; use 'I need to ___ tonight' for 'do the laundry', never 'I plan to ___ all the muddy clothes'.",
    "Do not silently substitute a more natural synonym that is absent from the supplied targets. Rewrite the surrounding sentence so the supplied target itself fits naturally.",
    "The four options must be four distinct displayed forms derived from targets in this input whenever possible.",
    "Before returning each card, substitute every displayed option into the exact visible sentence and judge the resulting complete sentence without using vocabularyId, the hidden definition, or knowledge of the intended answer.",
    "Exactly one option must be the uniquely best fit for the visible sentence. A non-answer is not excluded merely because it describes a different intended situation: if it produces another natural, coherent reading, the card is ambiguous and must be rewritten or use a different distractor.",
    "Make the answer unique with a concrete visible semantic, discourse, sequence, or collocational cue. Keep distractors challenging, but never rely on an unstated assumption about what the person probably meant.",
    "For example, reject 'After swimming, I need to ___ before meeting my friends' when the options include both 'comb my hair' and 'get dressed': both are coherent, and 'get dressed' may be the more likely prerequisite. Add visible context that specifically requires hair grooming, or choose a non-competing distractor.",
    "Return one optionChecks entry for each displayed option in the same wording. Set fits=true for every option that creates any natural, coherent reading of the visible sentence, not only for the intended answer. In visibleCue, copy an exact quote of at least two words from the visible sentence that supports or excludes that option; never invent an explanation. Exactly one check must have fits=true, and it must be the declared answer.",
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
      const drafts = validateGeneratedOptionChecks(
        response.output_parsed.cards,
      );
      return validateGeneratedCards(
        items,
        drafts.map(({ vocabularyId, sentence, answer, options }) => ({
          vocabularyId,
          sentence,
          answer,
          options,
        })),
        forbiddenSentences,
      );
    } catch (error) {
      if (attempt === 1) throw error;
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

export function validateGeneratedOptionChecks(
  cards: GeneratedQuizCardDraft[],
): GeneratedQuizCardDraft[] {
  for (const card of cards) {
    const normalizedSentence = normalizeQuizSentence(card.sentence);
    const normalizedAnswer = normalizeGeneratedOption(card.answer);
    const normalizedOptions = card.options.map(normalizeGeneratedOption);
    const normalizedChecks = card.optionChecks.map((check) => ({
      option: normalizeGeneratedOption(check.option),
      fits: check.fits,
      visibleCue: normalizeQuizSentence(check.visibleCue),
    }));
    const fittingChecks = normalizedChecks.filter((check) => check.fits);

    if (
      normalizedChecks.length !== normalizedOptions.length ||
      new Set(normalizedChecks.map((check) => check.option)).size !==
        normalizedOptions.length ||
      normalizedOptions.some(
        (option) =>
          !normalizedChecks.some((check) => check.option === option),
      ) ||
      normalizedChecks.some(
        (check) =>
          check.visibleCue.split(" ").length < 2 ||
          !normalizedSentence.includes(check.visibleCue),
      ) ||
      fittingChecks.length !== 1 ||
      fittingChecks[0].option !== normalizedAnswer
    ) {
      throw invalidGeneration();
    }
  }
  return cards;
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
          "Grade English vocabulary exercises strictly. Judge grammar after replacing ___ with the displayed answer. The displayed answer may be an inflected form of the canonical target, and dictionary placeholders such as 'to' and 'sth' need not appear literally. Check the target's full argument structure: reject an obligatorily transitive expression used without its object, and reject an expression that already contains its object when the sentence attaches another incompatible object. For example, reject 'I need to put on before we go outside' and 'I plan to do the laundry all the muddy clothes'. Do not accept a sentence merely because an absent synonym such as 'get dressed' or 'wash' would make it natural. A pass requires every filled sentence to be natural English, semantically aligned with its possibly non-English definition, unambiguous, and not to reveal or translate the definition.",
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

function normalizeGeneratedOption(option: string): string {
  return option.trim().toLocaleLowerCase("en");
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
