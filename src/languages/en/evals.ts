import type { EvalCase } from "../../../evals/types";
import { ENGLISH_LANGUAGE } from ".";

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

export const EVAL_CASES: EvalCase[] = [
  {
    id: "approved-starter-vocabulary",
    description:
      "Generates grammatical, unambiguous cards for every approved starter word and phrase.",
    appId: ENGLISH_LANGUAGE.id,
    items: ENGLISH_LANGUAGE.starterVocabulary.map((item, index) => ({
      id: String(index + 1),
      ...item,
    })),
  },
  {
    id: "russian-definitions",
    description:
      "Uses Russian definitions as guidance while keeping targets and exercises in English.",
    appId: ENGLISH_LANGUAGE.id,
    items: ENGLISH_LANGUAGE.starterVocabulary.map((item, index) => ({
      id: String(index + 1),
      term: item.term,
      definition: russianDefinitions[index],
    })),
  },
  {
    id: "smaller-round",
    description:
      "Generates a structurally complete round when fewer than ten items are available.",
    appId: ENGLISH_LANGUAGE.id,
    items: ENGLISH_LANGUAGE.starterVocabulary.slice(5).map((item, index) => ({
      id: String(index + 101),
      ...item,
    })),
  },
  {
    id: "avoid-recent-russian-definition-cards",
    description:
      "Generates fresh English situations instead of repeating recent cards when definitions are Russian.",
    appId: ENGLISH_LANGUAGE.id,
    items: ENGLISH_LANGUAGE.starterVocabulary
      .slice(5, 9)
      .map((item, index) => ({
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
    id: "phrasal-verb-argument-structure",
    description:
      "Keeps required clothing objects with transitive phrasal verbs and does not attach a second object to complete expressions.",
    appId: ENGLISH_LANGUAGE.id,
    items: [
      { id: "301", term: "put on", definition: "Надеть предмет одежды." },
      { id: "302", term: "take off", definition: "Снять предмет одежды." },
      {
        id: "303",
        term: "do the laundry",
        definition: "Постирать одежду.",
      },
      { id: "304", term: "get dressed", definition: "Одеться." },
    ],
  },
  {
    id: "coherent-routine-actions",
    description:
      "Makes one routine action uniquely best through visible context instead of relying on the intended scenario.",
    appId: ENGLISH_LANGUAGE.id,
    items: [
      { id: "401", term: "comb my hair", definition: "Причесаться." },
      { id: "402", term: "get dressed", definition: "Одеться." },
      {
        id: "403",
        term: "do my eyebrows",
        definition: "Привести брови в порядок.",
      },
      { id: "404", term: "yawn", definition: "Зевнуть." },
    ],
  },
];
