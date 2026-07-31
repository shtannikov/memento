import type {
  GenerationVocabularyItem,
  RecentQuizSentence,
} from "../openai";

export const CZECH_QUIZ_SYSTEM_PROMPT =
  "You create unambiguous Czech vocabulary exercises and follow the output schema exactly.";

export const CZECH_GRADER_PROMPT =
  "Grade Czech vocabulary exercises strictly. Judge the complete sentence after replacing ___ with the displayed answer. Accept a naturally inflected Czech form of the canonical target, but require correct case, person, number, gender, aspect, word order, preposition, and reflexive particle se/si. A pass requires every filled sentence to be idiomatic Czech, semantically aligned with its possibly non-Czech definition, unambiguous among the four visible options, and not to reveal or translate the definition.";

export function buildCzechQuizPrompt(
  items: GenerationVocabularyItem[],
  recentSentences: RecentQuizSentence[],
): string {
  return [
    "Create one Czech multiple-choice vocabulary card for every supplied item.",
    "The target is always Czech. Definitions may be in English, Russian, or another language; use them only as semantic guidance.",
    "Each sentence must contain the exact blank marker ___ once. Replacing ___ with the displayed answer must produce a complete, idiomatic Czech sentence.",
    "Inflect the canonical target when the sentence requires it. Czech case, person, number, gender, tense, aspect, preposition, and word order must agree with the visible context.",
    "Keep reflexive particles se and si with the expression in their natural position. Do not drop them or duplicate them outside the blank.",
    "Dictionary placeholders such as něco and někdo are semantic slots. Replace them with a concrete complement in the sentence instead of displaying a conflicting placeholder.",
    "For example, for 'těšit se na něco' use a natural form such as 'Už se ___ víkend' with answer 'těším na'; for 'dát si kávu' use 'Po obědě si ___' with answer 'dám kávu'.",
    "Do not replace the supplied target with a more natural synonym. Rewrite the surrounding Czech sentence so a form of the supplied target fits naturally.",
    "The four options must be four distinct displayed forms derived from targets in this input whenever possible.",
    "Substitute all four options into the sentence before returning a card. Exactly one option must be grammatically and semantically best from the visible Czech context.",
    "Do not translate, reveal, or quote definitions in sentences.",
    "Create fresh situations and wording. For each vocabularyId, do not reuse or closely paraphrase any of its recentSentences.",
    "Return every vocabularyId exactly once and do not add items.",
    JSON.stringify({ items, recentSentences }),
  ].join("\n");
}
