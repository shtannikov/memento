import type {
  GenerationVocabularyItem,
  RecentQuizSentence,
} from "../openai";

export const ENGLISH_QUIZ_SYSTEM_PROMPT =
  "You create unambiguous English vocabulary exercises and follow the output schema exactly.";

export const ENGLISH_GRADER_PROMPT =
  "Grade English vocabulary exercises strictly. Judge grammar after replacing ___ with the displayed answer. The displayed answer may be an inflected form of the canonical target, and dictionary placeholders such as 'to' and 'sth' need not appear literally. Check the target's full argument structure: reject an obligatorily transitive expression used without its object, and reject an expression that already contains its object when the sentence attaches another incompatible object. For example, reject 'I need to put on before we go outside' and 'I plan to do the laundry all the muddy clothes'. Do not accept a sentence merely because an absent synonym such as 'get dressed' or 'wash' would make it natural. A pass requires every filled sentence to be natural English, semantically aligned with its possibly non-English definition, unambiguous, and not to reveal or translate the definition.";

export function buildEnglishQuizPrompt(
  items: GenerationVocabularyItem[],
  recentSentences: RecentQuizSentence[],
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
    "Quickly substitute all four options into the sentence before returning a card. Exactly one option should be clearly the best fit from the visible context; distractors may look plausible at first, but must be noticeably worse.",
    "If another option is equally natural or more likely without inventing extra context, rewrite the sentence or choose a different distractor.",
    "For example, avoid 'After swimming, I need to ___ before meeting my friends' with both 'comb my hair' and 'get dressed': both fit, and 'get dressed' may fit better.",
    "Do not translate, reveal, or quote definitions in sentences.",
    "Create fresh situations and wording. For each vocabularyId, do not reuse or closely paraphrase any of its recentSentences.",
    "Return every vocabularyId exactly once and do not add items.",
    JSON.stringify({ items, recentSentences }),
  ].join("\n");
}
