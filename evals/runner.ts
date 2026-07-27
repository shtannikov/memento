import { loadEnvConfig } from "@next/env";

import { STARTER_VOCABULARY } from "../src/lib/domain/starter-vocabulary";
import type {
  GenerationVocabularyItem,
  RecentQuizSentence,
} from "../src/lib/server/openai";

loadEnvConfig(process.cwd());
const openaiClient = import("../src/lib/server/openai");

const MAX_TRANSIENT_RETRIES = 2;
const QUALITY_RETRIES = 2;

type EvalCase = {
  id: string;
  description: string;
  items: GenerationVocabularyItem[];
  recentSentences?: RecentQuizSentence[];
};

const russianDefinitions = [
  "Связанный с малоподвижным образом жизни.",
  "Солёный или пряный, но не сладкий.",
  "Спокойный и неторопливый.",
  "Короткий перерыв во время представления.",
  "Сильное внезапное желание.",
  "Закончить что-либо.",
  "Учесть что-либо при принятии решения.",
  "Отвечать за что-либо.",
  "Наоборот; верно противоположное.",
  "Частично, но не полностью.",
];

const cases: EvalCase[] = [
  {
    id: "approved-starter-vocabulary",
    description:
      "Generates grammatical, unambiguous cards for every approved starter word and phrase.",
    items: STARTER_VOCABULARY.map((item, index) => ({
      id: String(index + 1),
      ...item,
    })),
  },
  {
    id: "russian-definitions",
    description:
      "Uses Russian definitions as guidance while keeping targets and exercises in English.",
    items: STARTER_VOCABULARY.map((item, index) => ({
      id: String(index + 1),
      term: item.term,
      definition: russianDefinitions[index],
    })),
  },
  {
    id: "smaller-round",
    description:
      "Generates a structurally complete round when fewer than ten items are available.",
    items: STARTER_VOCABULARY.slice(5).map((item, index) => ({
      id: String(index + 101),
      ...item,
    })),
  },
  {
    id: "avoid-recent-russian-definition-cards",
    description:
      "Generates fresh English situations instead of repeating recent cards when definitions are Russian.",
    items: STARTER_VOCABULARY.slice(5, 9).map((item, index) => ({
      id: String(index + 201),
      term: item.term,
      definition: russianDefinitions[index + 5],
    })),
    recentSentences: [
      {
        vocabularyId: "201",
        sentence: "Let's ___ the meeting before lunch.",
      },
      {
        vocabularyId: "202",
        sentence:
          "The committee must ___ repair costs before approving the project.",
      },
      {
        vocabularyId: "203",
        sentence: "Maya will ___ the event.",
      },
      {
        vocabularyId: "204",
        sentence: "I expected rain; ___, the sky stayed completely clear.",
      },
    ],
  },
  {
    id: "unique-idiomatic-options",
    description:
      "Rejects ambiguous connectors and uses transitive and fixed expressions with natural complements.",
    items: [
      {
        id: "301",
        term: "on the contrary",
        definition: "Наоборот; верно противоположное.",
      },
      {
        id: "302",
        term: "as a matter of fact",
        definition: "На самом деле; более того.",
      },
      {
        id: "303",
        term: "put on",
        definition: "Надеть предмет одежды.",
      },
      {
        id: "304",
        term: "do the laundry",
        definition: "Стирать одежду.",
      },
    ],
  },
];

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
  );
  const grade = await gradeQuizCards(evalCase.items, cards);
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
      !evaluation.englishSentence ||
      !evaluation.meaningAligned ||
      !evaluation.idiomaticAnswer ||
      !evaluation.singleCorrectOption ||
      !evaluation.unambiguous ||
      !evaluation.definitionHidden,
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

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for live evals");
  }

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
