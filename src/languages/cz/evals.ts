import type { EvalCase } from "../../../evals/types";
import { CZECH_LANGUAGE } from ".";

export const EVAL_CASES: EvalCase[] = [
  {
    id: "czech-starter-vocabulary",
    description:
      "Generates grammatical Czech cards with natural inflection and reflexive particles.",
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
      { id: "601", term: "dát si kávu", definition: "Выпить кофе." },
      {
        id: "602",
        term: "těšit se na něco",
        definition: "Ждать с нетерпением.",
      },
      { id: "603", term: "dávat smysl", definition: "Иметь смысл." },
      { id: "604", term: "mít pravdu", definition: "Быть правым." },
    ],
  },
];
