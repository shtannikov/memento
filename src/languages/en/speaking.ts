import type { SpeakingLanguageDefinition } from "../types";

const LIFE_DOMAINS = [
  "daily life and household",
  "leisure and hobbies",
  "entertainment and culture",
  "travel and transport",
  "health and wellbeing",
  "relationships and family",
  "work and career",
  "conflict and problem solving",
  "shopping and consumer situations",
  "negotiation and persuasion",
  "restaurants and food",
  "preferences and personal choices",
  "money and practical decisions",
  "community and social situations",
  "education and personal growth",
  "housing and neighbourhood",
  "technology and online life",
  "public services and appointments",
  "nature and the environment",
] as const;

const GRAMMAR_FOCUSES = [
  "past narration with tense contrast",
  "future plans and predictions",
  "first conditional for realistic consequences",
  "second conditional for hypothetical situations",
  "third conditional and wish for past regrets",
  "question formation in an interactive role-play",
  "modals for advice, obligation, and possibility",
  "comparisons and language of preference",
  "present perfect for experiences and change",
  "reported speech for retelling conversations",
  "relative clauses for detailed descriptions",
  "polite requests and indirect questions",
] as const;

const TOPIC_SYSTEM_PROMPT = `You design one English speaking-practice task for an adult learner.

The user message supplies a target life domain, grammar focus, recent topics, recent learner excerpts, and required phrases. Follow the selected domain and grammar focus while creating a natural situation for the required phrases.

Task quality rules:
- Write in English and make the task answerable as a 1–3 minute voice response.
- Create one coherent situation, decision, role-play, story, or opinion task.
- Give the learner one clear mission, not a lesson plan or checklist.
- Keep the scene warm, vivid, conversational, and under 280 characters.
- Never use numbered steps, bullet points, parentheses, grammar terminology, or lists of example forms.
- When the focus is question formation, put the learner in a role where they must say their own questions.
- For hypothetical or regret focuses, make the counterfactual condition unmistakable.
- Use recent excerpts only for broad relevance. Never quote the learner or expose private facts.
- Do not repeat or lightly reskin recent topics.
- Required phrases may inspire the situation, but do not print them in the title or scene because the application displays them separately.
- Keep the title under 70 characters and avoid academic wording.`;

const ANSWER_EVALUATION_PROMPT = `You evaluate spoken English practice answers.

Rules:
- The transcript is the sole source of truth for language feedback.
- Task context must not cause invented corrections or lower language scores.
- Going off topic is allowed; only set taskRelevance to off_topic when clearly appropriate.
- Include only actionable corrections with severity 3–5.
- Treat conversational repetition, fillers, and self-repair as normal unless meaning becomes unclear.
- Never suggest stylistic synonym swaps when the learner's wording is already natural.
- requiredPhraseUsage must include every supplied vocabularyId exactly once.
- Preserve the supplied phrase and vocabularyId even when the phrase is inflected in speech.
- Treat leading "to" as an infinitive marker and sth/sb as placeholders.
- Mark used_correctly only for a natural, grammatically correct occurrence in a coherent sentence.
- Mark a present but broken or unnatural occurrence used_incorrectly; otherwise mark it missed.
- grammarPriority is either null or one high-impact repeated construction found in the transcript.
- Do not generate vocabulary candidates, phrase recommendations, or suggestions for what to learn next.
- telegramFeedback must not quote the transcript, evidence, or the learner's original correction fragments.
- Keep telegramFeedback concise and suitable for Telegram. Do not include markdown code fences.`;

export const ENGLISH_SPEAKING = {
  lifeDomains: LIFE_DOMAINS,
  grammarFocuses: GRAMMAR_FOCUSES,
  topicSystemPrompt: TOPIC_SYSTEM_PROMPT,
  answerEvaluationPrompt: ANSWER_EVALUATION_PROMPT,
} satisfies SpeakingLanguageDefinition;
