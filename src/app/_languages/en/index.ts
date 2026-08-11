import type { LanguageDefinition } from "../types";
import { ENGLISH_SPEAKING } from "./speaking";

const starterVocabulary = [
  { term: "sedentary", definition: "Involving little activity." },
  { term: "savoury", definition: "Salty or spicy, not sweet." },
  { term: "leisurely", definition: "Relaxed and unhurried." },
  { term: "intermission", definition: "A short break in a show." },
  { term: "urge", definition: "A strong sudden desire." },
  { term: "to wrap up sth", definition: "Finish something." },
  {
    term: "to take sth into account",
    definition: "Consider it when deciding.",
  },
  {
    term: "to be in charge of sth",
    definition: "Be responsible for it.",
  },
  { term: "on the contrary", definition: "The opposite is true." },
  { term: "to a certain extent", definition: "Partly, not completely." },
] as const;

export const ENGLISH_LANGUAGE = {
  id: "en",
  appName: "Memento",
  locale: "en",
  targetLanguage: "English",
  transcriptionLanguage: "en",
  transcriptionPrompt:
    "Transcribe the speech exactly as spoken. Preserve grammar mistakes, word choice, repetitions, filler words, false starts, and self-corrections. Do not rewrite, paraphrase, or correct anything. Add normal punctuation and capitalization only from the speaker's pauses and intonation.",
  appPath: "/",
  webhookPath: "/api/telegram/webhook",
  botTokenEnv: "TELEGRAM_BOT_TOKEN",
  webhookSecretEnv: "TELEGRAM_WEBHOOK_SECRET",
  starterVocabulary,
  speaking: ENGLISH_SPEAKING,
  quizSystemPrompt:
    "You create unambiguous English vocabulary exercises and follow the output schema exactly.",
  graderPrompt:
    "Grade English vocabulary exercises strictly. Replace ___ with the displayed answer exactly as written, without conjugating, deleting, reordering, or supplying any words, and judge the resulting complete sentence. The displayed answer may be an inflected form of the canonical target, and dictionary placeholders such as 'to' and 'sth' need not appear literally. Reject an answer that is incompatible with a visible auxiliary, modal, or negation; for example, reject sentence 'I didn't ___' with answer 'be offended' because it produces 'I didn't be offended'. Check the target's full argument structure: reject an obligatorily transitive expression used without its object, and reject an expression that already contains its object when the sentence attaches another incompatible object. For example, reject 'I need to put on before we go outside' and 'I plan to do the laundry all the muddy clothes'. Do not accept a sentence merely because an absent synonym such as 'get dressed' or 'wash' would make it natural. A pass requires every exactly filled sentence to be natural English, semantically aligned with its possibly non-English definition, unambiguous, and not to reveal or translate the definition.",
  buildQuizPrompt(items, recentSentences) {
    return [
      "Create one English multiple-choice vocabulary card for every supplied item.",
      "The target is always English. Its definition may be in any language, including Russian; use it only as semantic guidance.",
      "Each sentence must contain the exact blank marker ___ once. Replacing ___ with answer must produce a complete, natural English sentence.",
      "Treat answer as the final displayed replacement string. Insert it into ___ exactly as written: do not conjugate it, delete or reorder neighboring words, or imagine any additional words after insertion.",
      "The displayed answer may be a grammatically inflected form of the canonical target.",
      "For dictionary phrases beginning with 'to', omit or inflect the infinitive marker when the sentence requires it.",
      "Any visible auxiliary, modal, or negation must grammatically govern the exact displayed answer. If the target needs a different auxiliary or negation, include it in answer or rewrite the sentence; never remove it merely to avoid giving the learner a clue.",
      "For 'be offended', use sentence 'I ___; I asked what I could improve' with answer 'wasn't offended', or sentence 'I wasn't ___; I asked what I could improve' with answer 'offended'. Never use sentence 'I didn't ___' with answer 'be offended', which produces the ungrammatical 'I didn't be offended'.",
      "In dictionary phrases, 'sth' is only an object placeholder. Never display the literal text 'sth'; put the concrete object in the sentence outside the blank whenever possible.",
      "Preserve the target's argument structure. If the displayed answer requires an object or complement, include it outside the blank; never use the answer elliptically as though it meant a different intransitive expression.",
      "If the target already contains its object or complement, do not add a second object or incompatible continuation after the blank.",
      "Preserve grammatical person and point of view in every displayed answer. A possessive or reflexive pronoun inside the answer must agree with the visible subject or speaker.",
      "Use discourse markers according to their exact logical relation. A contradiction marker must directly reject or reverse a preceding claim; it cannot merely introduce a contrast, drawback, or consequence.",
      "For example, use 'I need to ___ my coat' for 'put on', never 'I need to ___ before we go outside'; use 'I need to ___ tonight' for 'do the laundry', never 'I plan to ___ all the muddy clothes'.",
      "Do not silently substitute a more natural synonym that is absent from the supplied targets. Rewrite the surrounding sentence so the supplied target itself fits naturally.",
      "The four options must be four distinct displayed forms derived from targets in this input whenever possible.",
      "Quickly substitute all four options into the sentence before returning a card. Exactly one option should be clearly the best fit from the visible context; distractors may look plausible at first, but must be noticeably worse.",
      "If another option is equally natural or more likely without inventing extra context, rewrite the sentence or choose a different distractor.",
      "For example, avoid 'After swimming, I need to ___ before meeting my friends' with both 'comb my hair' and 'get dressed': both fit, and 'get dressed' may fit better.",
      "As a final check, replace ___ with the exact answer string and read the entire result. If it is not grammatically complete and natural without any hidden transformation, rewrite the card.",
      "Do not translate, reveal, or quote definitions in sentences.",
      "Create fresh situations and wording. For each vocabularyId, do not reuse or closely paraphrase any of its recentSentences.",
      "Return every vocabularyId exactly once and do not add items.",
      JSON.stringify({ items, recentSentences }),
    ].join("\n");
  },
} satisfies LanguageDefinition<"en">;
