import type { LanguageDefinition } from "../types";

const starterVocabulary = [
  { term: "zapamatovat si", definition: "to remember" },
  { term: "zapomenout", definition: "to forget" },
  { term: "víc", definition: "more" },
  { term: "procházet se", definition: "to take a walk" },
  { term: "pohovka", definition: "sofa" },
  { term: "nábytek", definition: "furniture" },
  { term: "čekat na někoho", definition: "to wait for someone" },
  { term: "starat se o někoho", definition: "to take care of someone" },
  { term: "ještě", definition: "still; yet; another" },
  { term: "už", definition: "already; no longer" },
] as const;

export const CZECH_LANGUAGE = {
  id: "cz",
  locale: "cs-CZ",
  targetLanguage: "Czech",
  appPath: "/cz",
  webhookPath: "/api/telegram/webhook/cz",
  botTokenEnv: "TELEGRAM_CZ_BOT_TOKEN",
  webhookSecretEnv: "TELEGRAM_CZ_WEBHOOK_SECRET",
  starterVocabulary,
  quizSystemPrompt:
    "You create unambiguous Czech vocabulary exercises and follow the output schema exactly.",
  graderPrompt:
    "Grade Czech vocabulary exercises strictly. Judge the complete sentence after replacing ___ with the displayed answer. Accept a naturally inflected Czech form of the canonical target, but require correct case, person, number, gender, aspect, word order, preposition, and reflexive particle se/si. A pass requires every filled sentence to be idiomatic Czech, semantically aligned with its possibly non-Czech definition, unambiguous among the four visible options, and not to reveal or translate the definition.",
  buildQuizPrompt(items, recentSentences) {
    return [
      "Create one Czech multiple-choice vocabulary card for every supplied item.",
      "The target is always Czech. Definitions may be in English, Russian, or another language; use them only as semantic guidance.",
      "Each sentence must contain the exact blank marker ___ once. Replacing ___ with the displayed answer must produce a complete, idiomatic Czech sentence.",
      "Inflect the canonical target when the sentence requires it. Czech case, person, number, gender, tense, aspect, preposition, and word order must agree with the visible context.",
      "Keep reflexive particles se and si with the expression in their natural position. Do not drop them or duplicate them outside the blank.",
      "Dictionary placeholders such as něco and někdo are semantic slots. Replace them with a concrete complement in the sentence instead of displaying a conflicting placeholder.",
      "For example, for 'čekat na někoho' use 'Před nádražím ___ kamaráda' with answer 'čekám na'; for 'starat se o někoho' use 'Každý den se ___ nemocnou babičku' with answer 'starám o'.",
      "Do not replace the supplied target with a more natural synonym. Rewrite the surrounding Czech sentence so a form of the supplied target fits naturally.",
      "The four options must be four distinct displayed forms derived from targets in this input whenever possible.",
      "Substitute all four options into the sentence before returning a card. Exactly one option must be grammatically and semantically best from the visible Czech context.",
      "Do not translate, reveal, or quote definitions in sentences.",
      "Create fresh situations and wording. For each vocabularyId, do not reuse or closely paraphrase any of its recentSentences.",
      "Return every vocabularyId exactly once and do not add items.",
      JSON.stringify({ items, recentSentences }),
    ].join("\n");
  },
} satisfies LanguageDefinition<"cz">;
