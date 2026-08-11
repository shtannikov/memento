import { loadEnvConfig } from "@next/env";

import { loadEvalCases, loadSpeakingEvalCases } from "./loader";
import type { EvalCase, SpeakingEvalCase } from "./types";

loadEnvConfig(process.cwd());
const openaiClient = import("../../src/app/_server/openai");

const MAX_TRANSIENT_RETRIES = 2;
const QUALITY_RETRIES = 2;

async function runCase(evalCase: EvalCase) {
  const {
    areQuizSentencesTooSimilar,
    generateQuizCards,
    gradeQuizCards,
  } = await openaiClient;
  const cards = await generateQuizCards(
    evalCase.items,
    1,
    undefined,
    evalCase.recentSentences,
    evalCase.appId,
  );
  const grade = await gradeQuizCards(
    evalCase.items,
    cards,
    undefined,
    evalCase.appId,
  );
  const expectedIds = new Set(evalCase.items.map((item) => item.id));
  const cardIds = new Set(cards.map((card) => card.vocabularyId));
  const noCyrillic = cards.every(
    (card) =>
      !/[А-Яа-яЁё]/u.test(card.sentence) &&
      !card.options.some((option) => /[А-Яа-яЁё]/u.test(option)),
  );
  const structural =
    cards.length === evalCase.items.length &&
    expectedIds.size === cardIds.size &&
    [...expectedIds].every((id) => cardIds.has(id)) &&
    cards.every(
      (card) =>
        card.sentence.split("___").length - 1 === 1 &&
        card.options.length === 4 &&
        new Set(card.options.map((option) => option.toLowerCase())).size ===
          4 &&
        card.options.filter(
          (option) => option.toLowerCase() === card.answer.toLowerCase(),
        ).length === 1,
    );
  const novel = cards.every((card) =>
    (evalCase.recentSentences ?? [])
      .filter((recent) => recent.vocabularyId === card.vocabularyId)
      .every(
        (recent) =>
          !areQuizSentencesTooSimilar(card.sentence, recent.sentence),
      ),
  );
  const failedEvaluations = grade.evaluations.filter(
    (evaluation) =>
      !evaluation.targetLanguageSentence ||
      !evaluation.meaningAligned ||
      !evaluation.unambiguous ||
      !evaluation.definitionHidden,
  );
  const failedVocabularyIds = new Set(
    failedEvaluations.map((evaluation) => evaluation.vocabularyId),
  );
  return {
    passed:
      structural &&
      noCyrillic &&
      novel &&
      grade.passed &&
      grade.evaluations.length === evalCase.items.length,
    structural,
    noCyrillic,
    novel,
    semantic: grade.passed,
    failedEvaluations,
    failedCards: cards.filter((card) =>
      failedVocabularyIds.has(card.vocabularyId),
    ),
  };
}

async function runWithTransientRetries(evalCase: EvalCase) {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_TRANSIENT_RETRIES; attempt += 1) {
    try {
      return await runCase(evalCase);
    } catch (error) {
      lastError = error;
      if (!isTransient(error) || attempt === MAX_TRANSIENT_RETRIES) throw error;
      await new Promise((resolve) =>
        setTimeout(resolve, 1000 * (attempt + 1)),
      );
    }
  }
  throw lastError;
}

async function runSpeakingCase(evalCase: SpeakingEvalCase) {
  const {
    evaluateSpeakingAnswer,
    generateSpeakingTopic,
    gradeSpeakingTopic,
  } = await openaiClient;
  if (evalCase.kind === "topic") {
    const topic = await generateSpeakingTopic(evalCase.input, 1, evalCase.appId);
    const recentTitles = new Set(
      evalCase.input.recentTopics.map((item) => item.topic.toLowerCase()),
    );
    const grade = await gradeSpeakingTopic(
      evalCase.input,
      topic,
      1,
      evalCase.appId,
    );
    const passed =
      topic.domain === evalCase.input.targetDomain &&
      topic.grammarFocus === evalCase.input.targetGrammarFocus &&
      topic.title.length > 0 &&
      topic.speakingPrompt.length > 0 &&
      !recentTitles.has(topic.title.toLowerCase()) &&
      grade.passed;
    return { passed, topic, grade };
  }
  const evaluation = await evaluateSpeakingAnswer(
    evalCase.transcript,
    evalCase.task,
    1,
    evalCase.appId,
  );
  const actualUsage = Object.fromEntries(
    evaluation.requiredPhraseUsage.map((item) => [item.vocabularyId, item.status]),
  );
  const correctionsCoverExpectedErrors =
    evalCase.expectedCorrectionFragments?.every((fragment) =>
      evaluation.corrections.some((correction) =>
        textRangesOverlap(fragment, correction.original)
      )
    ) ?? true;
  const passed =
    Object.entries(evalCase.expectedUsage).every(
      ([id, status]) => actualUsage[id] === status,
    ) &&
    (evalCase.expectedSubstantiveSpeech === undefined ||
      evaluation.substantiveSpeech === evalCase.expectedSubstantiveSpeech) &&
    correctionsCoverExpectedErrors &&
    (evalCase.expectGrammarPriority !== true ||
      evaluation.grammarPriority !== null) &&
    evaluation.telegramFeedback.trim().length > 0;
  return {
    passed,
    actualUsage,
    correctionsCoverExpectedErrors,
    evaluation,
  };
}

function textRangesOverlap(expected: string, actual: string): boolean {
  const normalizedExpected = expected.toLocaleLowerCase("en");
  const normalizedActual = actual.toLocaleLowerCase("en");
  return normalizedExpected.includes(normalizedActual) ||
    normalizedActual.includes(normalizedExpected);
}

async function runSpeakingWithTransientRetries(evalCase: SpeakingEvalCase) {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_TRANSIENT_RETRIES; attempt += 1) {
    try {
      return await runSpeakingCase(evalCase);
    } catch (error) {
      lastError = error;
      if (!isTransient(error) || attempt === MAX_TRANSIENT_RETRIES) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
  throw lastError;
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for live evals");
  }

  const cases = await loadEvalCases();
  let failed = false;
  for (const evalCase of cases) {
    const startedAt = Date.now();
    try {
      const first = await runWithTransientRetries(evalCase);
      let passed = first.passed;
      let result = first;
      if (!passed) {
        const retries = [];
        for (let attempt = 0; attempt < QUALITY_RETRIES; attempt += 1) {
          retries.push(await runWithTransientRetries(evalCase));
        }
        passed = retries.every((retry) => retry.passed);
        result = retries.at(-1) ?? first;
      }
      failed ||= !passed;
      console.log(
        JSON.stringify({
          id: evalCase.id,
          description: evalCase.description,
          passed,
          durationMs: Date.now() - startedAt,
          assertions: result,
        }),
      );
    } catch (error) {
      failed = true;
      console.error(
        JSON.stringify({
          id: evalCase.id,
          passed: false,
          durationMs: Date.now() - startedAt,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  }
  const speakingCases = await loadSpeakingEvalCases();
  for (const evalCase of speakingCases) {
    const startedAt = Date.now();
    try {
      const result = await runSpeakingWithTransientRetries(evalCase);
      failed ||= !result.passed;
      console.log(
        JSON.stringify({
          id: evalCase.id,
          description: evalCase.description,
          passed: result.passed,
          durationMs: Date.now() - startedAt,
          assertions: result,
        }),
      );
    } catch (error) {
      failed = true;
      console.error(
        JSON.stringify({
          id: evalCase.id,
          passed: false,
          durationMs: Date.now() - startedAt,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  }
  if (failed) process.exitCode = 1;
}

function isTransient(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (
    "status" in error &&
    typeof error.status === "number" &&
    [429, 500, 502, 503, 504].includes(error.status)
  ) {
    return true;
  }
  const message = error.message.toLowerCase();
  return (
    /\b(429|500|502|503|504)\b/.test(message) ||
    message.includes("rate limit") ||
    message.includes("timeout") ||
    message.includes("network") ||
    message.includes("socket")
  );
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
