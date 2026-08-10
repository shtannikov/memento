import type { EvalCase } from "../../../tooling/evals/types";
import { CZECH_LANGUAGE } from ".";

export const EVAL_CASES: EvalCase[] = [
  {
    id: "czech-starter-vocabulary",
    description:
      "Generates grammatical Czech cards after exact answer substitution, with natural inflection and reflexive particles placed exactly once.",
    appId: CZECH_LANGUAGE.id,
    items: CZECH_LANGUAGE.starterVocabulary.map((item, index) => ({
      id: String(index + 501),
      ...item,
    })),
  },
  {
    id: "czech-russian-definitions",
    description:
      "Uses Russian definitions as guidance while keeping targets and exercises in Czech.",
    appId: CZECH_LANGUAGE.id,
    items: [
      { id: "601", term: "zapamatovat si", definition: "Запомнить." },
      { id: "602", term: "zapomenout", definition: "Забыть." },
      { id: "603", term: "procházet se", definition: "Прогуливаться." },
      {
        id: "604",
        term: "čekat na někoho",
        definition: "Ждать кого-либо.",
      },
      {
        id: "605",
        term: "starat se o někoho",
        definition: "Заботиться о ком-либо.",
      },
    ],
  },
  {
    id: "czech-lexically-diverse-options",
    description:
      "Uses distinct Czech vocabulary targets as options instead of testing four inflections of kufr, noviny, or another single word.",
    appId: CZECH_LANGUAGE.id,
    items: [
      { id: "701", term: "kufr", definition: "suitcase" },
      { id: "702", term: "noviny", definition: "newspaper" },
      { id: "703", term: "pas", definition: "passport" },
      { id: "704", term: "letenka", definition: "ticket" },
    ],
  },
];
