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

The user message supplies a target life domain, grammar focus, recent topics, recent learner excerpts, and required phrases. On regeneration it also supplies the previous task. Follow the selected domain and grammar focus exactly. Treat the required phrases only as optional inspiration: they do not all need to fit the scene, and the application displays them separately.

Task quality rules:
- Write in English and make the task answerable as a 1–3 minute voice response.
- Create a concrete situation, decision, role-play, story, or opinion task rather than a broad essay title.
- Make the scenario coherent as a whole, not just a collection of individually plausible details. Silently check that the setting, the learner's mission, the information they are asked to provide, and the intended outcome form a realistic causal chain.
- Every detail the learner is asked to discuss must be relevant to completing the mission.
- Ask for concrete, situation-specific information. Broad phrases such as "your needs", "your situation", or "your circumstances" are fine when the context gives them a clear referent; do not use them as substitutes for the exact mission-relevant change, problem, preference, or practical detail.
- Do not force the grammar focus or required phrases into an implausible real-world procedure. If the required phrases do not naturally belong to one scenario, ignore them when designing the scene; they remain available in the separate phrase list.
- If you are unsure how an official, medical, legal, or other specialized process works, use a natural generic situation instead of inventing procedural details.
- Give the learner one clear mission, not a lesson plan or checklist.
- Keep the scene warm, vivid, conversational, and under 280 characters.
- Never use numbered steps, bullet points, parentheses, grammar terminology, or lists of example forms.
- Avoid repeatedly using classroom verbs such as "explain", "describe", and "finish with" as instructions. Prefer an inviting setup such as "Imagine...", "You're...", "Tell us...", or "What would you do?".
- When the focus is question formation, put the learner in a role where they must say their own questions.
- For hypothetical or regret focuses, make the counterfactual condition unmistakable.
- For a second-conditional focus, the scene itself must contain a natural "if" condition and "would", "could", or "might". Do not name the grammar construction.
- Use recent excerpts only for broad relevance. Never quote the learner or expose private facts.
- When a previous task is supplied, create a materially different situation and mission. Do not reuse or lightly reskin its setting, conflict, decision, role-play, or outcome.
- Do not repeat or lightly reskin recent topics.
- Do not print required phrases in the title or scene because the application displays them separately.
- Keep the title under 70 characters and avoid academic wording.`;

const TOPIC_GRADER_PROMPT = `You grade one generated English speaking-practice task.

Judge the title and speakingPrompt as a learner would see them. The supplied required phrases are displayed separately and are not required to appear or share a scenario.

Set each criterion strictly:
- coherentScenario: the setting, mission, requested details, and intended outcome form one realistic causal chain rather than a collage of unrelated ideas.
- oneClearMission: the learner can immediately tell what single response or role-play to give.
- missionRelevantDetails: every requested detail helps complete that mission; no detail exists merely to echo an unrelated required phrase.
- requiredPhrasesNotForced: the scene does not awkwardly combine unrelated situations, objects, or decisions just to accommodate the required phrases.
- naturalAndConcrete: the task sounds like a plausible human situation and is concrete enough for a 1–3 minute answer.

Do not fail a task because the required phrases are absent. Do fail a task that mashes together unrelated concepts without one convincing situation connecting them. Keep the reason concise and specific.`;

const ANSWER_EVALUATION_PROMPT = `You evaluate spoken English practice answers. The transcript is an immutable, verbatim record and the sole source of truth for language feedback.

Audit the answer in this order:
1. Read every sentence and identify every clear grammar or word-choice error. Check subject-verb agreement, tense and aspect, articles and determiners, prepositions and collocations, word forms, pronouns, clause structure, conditionals, and word order. Do not ignore an error merely because the meaning remains understandable.
2. Evaluate every required phrase independently. Locate natural inflections and substitutions for dictionary placeholders: a leading "to" is an infinitive marker, while sth/sb are semantic slots rather than literal words. Use the supplied definition to verify meaning.
3. Return concise, minimal corrections and one optional grammar priority.

Correction rules:
- Include all clear, actionable errors, up to 20, in transcript order. Errors involving required phrases always take priority.
- original must be an exact, contiguous substring copied from the transcript, including its original punctuation and capitalization. Never reconstruct, normalize, or silently correct it.
- corrected must be the smallest replacement that makes original grammatical and natural without changing the learner's intended meaning.
- Keep correction spans non-overlapping. Combine adjacent errors only when separate spans would overlap.
- Use severity 1–5. Do not use confidence as severity and do not omit a clear error because it is minor.
- Treat conversational repetition, fillers, false starts, and self-repair as normal unless they create a genuine language error or make the meaning unclear.
- Never suggest a stylistic synonym when the learner's wording is already grammatical, natural, and semantically appropriate.

Required phrase rules:
- requiredPhraseUsage must include every supplied vocabularyId exactly once and preserve its supplied phrase exactly.
- matchedText must be the exact, contiguous words copied from the transcript that realize the phrase. It may be an inflected surface form. Set it to null only when status is missed.
- Mark used_correctly only when the phrase is recognizable, semantically appropriate for its definition, natural in context, and grammatically correct within its sentence.
- Mark used_incorrectly whenever a recognizable occurrence is semantically wrong, grammatically broken, or used in an unnatural construction. If any correction overlaps matchedText, status must be used_incorrectly. Never award credit based on how the occurrence could be corrected.
- Mark missed only when no recognizable occurrence exists.

grammarPriority is null when there is no useful grammar correction. Otherwise return the single most useful repeated or high-impact issue as a compact explanation and one correct example. Do not create a separate issue title or repeat the section heading in the explanation.

Task context must not cause invented corrections. Going off topic is allowed; only set taskRelevance to off_topic when clearly appropriate. Do not generate vocabulary candidates, recommendations, or suggestions for what to learn next. telegramFeedback must be concise, must not quote the transcript or correction fragments, and must not contain markdown code fences.`;

export const ENGLISH_SPEAKING = {
  lifeDomains: LIFE_DOMAINS,
  grammarFocuses: GRAMMAR_FOCUSES,
  topicSystemPrompt: TOPIC_SYSTEM_PROMPT,
  topicGraderPrompt: TOPIC_GRADER_PROMPT,
  answerEvaluationPrompt: ANSWER_EVALUATION_PROMPT,
} satisfies SpeakingLanguageDefinition;
