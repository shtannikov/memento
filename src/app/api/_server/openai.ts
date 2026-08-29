import "server-only";

import { createHash } from "node:crypto";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

import { DEFAULT_APP_ID, type AppId } from "@/app/app-config";
import { getLanguage } from "@/app/_languages/registry";
import type {
  LanguageRecentSentence,
  LanguageVocabularyItem,
} from "@/app/_languages/types";
import type {
  AnswerEvaluation,
  GeneratedTopic,
  SpeakingTask,
  TopicGenerationInput,
} from "@/app/_features/speaking/domain";
import { AppError } from "./api";

export type GenerationVocabularyItem = LanguageVocabularyItem;

export type GeneratedQuizCard = {
  vocabularyId: string;
  sentence: string;
  answer: string;
  options: string[];
};

export type RecentQuizSentence = LanguageRecentSentence;

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
      targetLanguageSentence: z.boolean(),
      meaningAligned: z.boolean(),
      unambiguous: z.boolean(),
      definitionHidden: z.boolean(),
    }),
  ),
  passed: z.boolean(),
});

const SpeakingTopicSchema = z.object({
  title: z.string().trim().min(1).max(70),
  speakingPrompt: z.string().trim().min(1).max(300),
});

const SpeakingTopicGradeSchema = z.object({
  coherentScenario: z.boolean(),
  groundedSequence: z.boolean(),
  oneClearMission: z.boolean(),
  missionRelevantDetails: z.boolean(),
  requiredPhrasesNotForced: z.boolean(),
  naturalAndConcrete: z.boolean(),
  fluentAndComplete: z.boolean(),
  clearRolesAndContext: z.boolean(),
  justifiedLearnerRole: z.boolean(),
  distinctUnderlyingPattern: z.boolean(),
  variedPromptStructure: z.boolean(),
  reason: z.string().trim().min(1).max(500),
});

const SpeakingEvaluationSchema = z.object({
  coverageScore: z.number().min(0).max(100),
  substantiveSpeech: z.boolean(),
  corrections: z.array(z.object({
    category: z.string().max(80),
    original: z.string().trim().min(1).max(400),
    corrected: z.string().trim().min(1).max(400),
    why: z.string().trim().min(1).max(500),
    severity: z.number().min(1).max(5),
  })).max(20),
  requiredPhraseUsage: z.array(z.object({
    vocabularyId: z.string(),
    phrase: z.string().max(200),
    status: z.enum(["used_correctly", "used_incorrectly", "missed"]),
    matchedText: z.string().trim().min(1).max(400).nullable(),
  })).max(3),
  grammarPriority: z.object({
    explanation: z.string().trim().min(1).max(500),
    example: z.string().trim().min(1).max(400),
  }).nullable(),
  telegramFeedback: z.string().max(1200),
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
  appId: AppId = DEFAULT_APP_ID,
): string {
  return getLanguage(appId).buildQuizPrompt(items, recentSentences);
}

export async function generateQuizCards(
  items: GenerationVocabularyItem[],
  userId: number,
  openai = getOpenAIClient(),
  recentSentences: RecentQuizSentence[] = [],
  appId: AppId = DEFAULT_APP_ID,
): Promise<GeneratedQuizCard[]> {
  let forbiddenSentences = recentSentences;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await requestQuizCards(
      items,
      userId,
      forbiddenSentences,
      openai,
      appId,
    );
    try {
      return validateGeneratedCards(
        items,
        response.output_parsed.cards,
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
  appId: AppId = DEFAULT_APP_ID,
): Promise<z.infer<typeof QuizGradeSchema>> {
  const response = await openai.responses.parse({
    model: process.env.OPENAI_CHAT_MODEL ?? "gpt-5.6-luna",
    reasoning: { effort: "low" },
    store: false,
    max_output_tokens: 2500,
    input: [
      {
        role: "system",
        content: getLanguage(appId).graderPrompt,
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

export async function transcribeVoice(
  input: { bytes: Uint8Array; filename: string; mimeType?: string },
  appId: AppId,
  openai = getOpenAIClient(),
): Promise<string> {
  const language = getLanguage(appId);
  const filename = normalizeVoiceFilename(input.filename);
  const file = new File([input.bytes as Uint8Array<ArrayBuffer>], filename, {
    type: input.mimeType ?? "audio/ogg",
  });
  const result = await openai.audio.transcriptions.create({
    file,
    model: process.env.OPENAI_STT_MODEL ?? "gpt-4o-transcribe",
    language: language.transcriptionLanguage,
    prompt: language.transcriptionPrompt,
    response_format: "json",
  });
  const transcript = result.text.trim();
  if (!transcript) throw new Error("Voice transcription was empty");
  return transcript;
}

export async function generateSpeakingTopic(
  input: TopicGenerationInput,
  userId: number,
  appId: AppId,
  openai = getOpenAIClient(),
): Promise<GeneratedTopic> {
  const speaking = getLanguage(appId).speaking;
  if (!speaking) throw new AppError("SPEAKING_UNAVAILABLE", "Speaking practice is unavailable.", 409);
  const response = await openai.responses.parse({
    model: process.env.OPENAI_CHAT_MODEL ?? "gpt-5.6-luna",
    reasoning: { effort: "medium" },
    store: false,
    max_output_tokens: 1200,
    safety_identifier: createHash("sha256")
      .update(`memento-speaking-topic:${appId}:${userId}`)
      .digest("hex"),
    input: [
      { role: "system", content: speaking.topicSystemPrompt },
      { role: "user", content: JSON.stringify(input) },
    ],
    text: {
      format: zodTextFormat(
        SpeakingTopicSchema,
        "memento_speaking_topic",
      ),
    },
  });
  if (response.status !== "completed" || !response.output_parsed) {
    throw new Error("Speaking topic generation failed");
  }
  return {
    title: response.output_parsed.title,
    speakingPrompt: response.output_parsed.speakingPrompt,
    domain: input.targetDomain,
    grammarFocus: input.targetGrammarFocus,
  };
}

export async function gradeSpeakingTopic(
  input: TopicGenerationInput,
  topic: GeneratedTopic,
  userId: number,
  appId: AppId,
  openai = getOpenAIClient(),
): Promise<z.infer<typeof SpeakingTopicGradeSchema> & { passed: boolean }> {
  const speaking = getLanguage(appId).speaking;
  if (!speaking) {
    throw new AppError(
      "SPEAKING_UNAVAILABLE",
      "Speaking practice is unavailable.",
      409,
    );
  }
  const response = await openai.responses.parse({
    model: process.env.OPENAI_CHAT_MODEL ?? "gpt-5.6-luna",
    reasoning: { effort: "low" },
    store: false,
    max_output_tokens: 1200,
    safety_identifier: createHash("sha256")
      .update(`memento-speaking-topic-grade:${appId}:${userId}`)
      .digest("hex"),
    input: [
      { role: "system", content: speaking.topicGraderPrompt },
      { role: "user", content: JSON.stringify({ input, topic }) },
    ],
    text: {
      format: zodTextFormat(
        SpeakingTopicGradeSchema,
        "memento_speaking_topic_grade",
      ),
    },
  });
  if (response.status !== "completed" || !response.output_parsed) {
    throw new Error("Speaking topic grader did not return a complete result");
  }
  const grade = response.output_parsed;
  return {
    ...grade,
    passed:
      grade.coherentScenario &&
      grade.groundedSequence &&
      grade.oneClearMission &&
      grade.missionRelevantDetails &&
      grade.requiredPhrasesNotForced &&
      grade.naturalAndConcrete &&
      grade.fluentAndComplete &&
      grade.clearRolesAndContext &&
      grade.justifiedLearnerRole &&
      grade.distinctUnderlyingPattern &&
      grade.variedPromptStructure,
  };
}

export async function evaluateSpeakingAnswer(
  transcript: string,
  task: SpeakingTask,
  userId: number,
  appId: AppId,
  openai = getOpenAIClient(),
): Promise<AnswerEvaluation> {
  const speaking = getLanguage(appId).speaking;
  if (!speaking) throw new AppError("SPEAKING_UNAVAILABLE", "Speaking practice is unavailable.", 409);
  const response = await openai.responses.parse({
    model:
      process.env.OPENAI_SPEAKING_EVALUATION_MODEL ??
      process.env.OPENAI_CHAT_MODEL ??
      "gpt-5.6-luna",
    reasoning: { effort: "medium" },
    store: false,
    max_output_tokens: 8000,
    safety_identifier: createHash("sha256")
      .update(`memento-speaking-answer:${appId}:${userId}`)
      .digest("hex"),
    input: [
      { role: "system", content: speaking.answerEvaluationPrompt },
      { role: "user", content: JSON.stringify({ transcript, task }) },
    ],
    text: {
      format: zodTextFormat(
        SpeakingEvaluationSchema,
        "memento_speaking_evaluation",
      ),
    },
  });
  if (response.status !== "completed" || !response.output_parsed) {
    throw new Error("Speaking answer evaluation failed");
  }
  const evaluation = response.output_parsed;
  const expected = new Map(task.items.map((item) => [item.vocabularyId, item.term]));
  if (
    evaluation.requiredPhraseUsage.length !== task.items.length ||
    new Set(evaluation.requiredPhraseUsage.map((item) => item.vocabularyId)).size !== task.items.length ||
    evaluation.requiredPhraseUsage.some(
      (item) => expected.get(item.vocabularyId)?.toLocaleLowerCase() !== item.phrase.toLocaleLowerCase(),
    )
  ) {
    throw new Error("Speaking evaluation returned invalid vocabulary references");
  }
  if (
    evaluation.corrections.some(
      (correction) => !containsCaseInsensitive(transcript, correction.original),
    ) ||
    evaluation.requiredPhraseUsage.some((usage) =>
      usage.status === "missed"
        ? usage.matchedText !== null
        : usage.matchedText === null ||
          !containsCaseInsensitive(transcript, usage.matchedText)
    )
  ) {
    throw new Error(
      "Speaking evaluation returned text that is absent from the transcript",
    );
  }
  const correctionRanges = evaluation.corrections.flatMap((correction) =>
    findCaseInsensitiveRanges(transcript, correction.original)
  );
  for (const usage of evaluation.requiredPhraseUsage) {
    if (
      !evaluation.substantiveSpeech &&
      usage.status === "used_correctly"
    ) {
      usage.status = "used_incorrectly";
    }
    if (usage.status !== "used_correctly" || usage.matchedText === null) {
      continue;
    }
    const usageRanges = findCaseInsensitiveRanges(transcript, usage.matchedText);
    if (
      usageRanges.some((usageRange) =>
        correctionRanges.some((correctionRange) =>
          rangesOverlap(usageRange, correctionRange)
        )
      )
    ) {
      usage.status = "used_incorrectly";
    }
  }
  return evaluation;
}

function containsCaseInsensitive(haystack: string, needle: string): boolean {
  return haystack.toLocaleLowerCase().includes(
    needle.toLocaleLowerCase(),
  );
}

function findCaseInsensitiveRanges(
  haystack: string,
  needle: string,
): Array<{ start: number; end: number }> {
  const normalizedHaystack = haystack.toLocaleLowerCase();
  const normalizedNeedle = needle.toLocaleLowerCase();
  const ranges: Array<{ start: number; end: number }> = [];
  let start = normalizedHaystack.indexOf(normalizedNeedle);
  while (start !== -1) {
    ranges.push({ start, end: start + needle.length });
    start = normalizedHaystack.indexOf(normalizedNeedle, start + 1);
  }
  return ranges;
}

function rangesOverlap(
  left: { start: number; end: number },
  right: { start: number; end: number },
): boolean {
  return left.start < right.end && left.end > right.start;
}

function normalizeVoiceFilename(value: string): string {
  const basename = value.split("/").pop()?.trim() || "voice.ogg";
  return basename.replace(/\.[^./\\]+$/, "") + ".ogg";
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
  appId: AppId,
) {
  try {
    const response = await openai.responses.parse({
      model: process.env.OPENAI_CHAT_MODEL ?? "gpt-5.6-luna",
      reasoning: { effort: "medium" },
      store: false,
      max_output_tokens: 4000,
      safety_identifier: createHash("sha256")
        .update(`memento:${appId}:${userId}`)
        .digest("hex"),
      input: [
        {
          role: "system",
          content: getLanguage(appId).quizSystemPrompt,
        },
        { role: "user", content: buildQuizPrompt(items, recentSentences, appId) },
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
