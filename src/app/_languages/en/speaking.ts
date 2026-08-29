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

The user message supplies a target life domain, grammar focus, up to five recent tasks, and required phrases. Follow the selected domain and grammar focus exactly. The application displays the required phrases separately.

Task quality rules:
- Write in English and make the task answerable as a 1–3 minute voice response.
- Create a concrete situation, decision, role-play, story, or opinion task rather than a broad essay title.
- Make the scenario coherent as a whole, not just a collection of individually plausible details. The setting, mission, requested information, and intended outcome must form a realistic causal chain. Before finalizing it, mentally play the scene from start to finish and track the learner's location, each movement, the order of events, what the learner can know, and who takes each action. Anchor relative places and objects when their location matters to the causal chain. Every transition must be physically and causally plausible without the learner inventing missing facts.
- Write the opening setup as natural, connected prose rather than a compressed headline or incident summary. Give enough context to understand what was expected, what changed or went wrong, and why the learner needs to act.
- Make the learner's position concrete. When another person matters, identify their relationship or role naturally, such as a friend, partner, colleague, customer, neighbour, or waiter, and make clear whether the learner is with them, calling them, or speaking on their behalf. Avoid vague labels such as "a guest", "someone", or "a person" when the relationship shapes the scene.
- If a character has an important limitation or unusual difficulty, make its cause understandable when it is not already obvious. Name the specific obstacle instead of implying a broader inability: for example, say that a colleague speaks little English and cannot follow the English menu, not that they "can't read the menu easily".
- Every detail the learner is asked to discuss must be relevant to completing the mission.
- Establish every mission-relevant fact the learner is asked to report. For past narration, state the event sequence through the relevant outcome before asking the learner to retell it. If the learner should invent a response, decision, or outcome, make that creative role explicit instead of presenting it as a known event.
- Use one consistent role label for the same participant, and make every pronoun and arrival reference resolve to exactly one established person.
- Ask for concrete, situation-specific information. Broad phrases such as "your needs", "your situation", or "your circumstances" are fine when the context gives them a clear referent; do not use them as substitutes for the exact mission-relevant change, problem, preference, or practical detail.
- Match the tone to the intended social stakes. In recommendations, disagreements, and realistic conditionals, frame outcomes as benefits, trade-offs, or constructive next steps. Name the helpful action the learner would take so the task cannot sound threatening, punitive, or retaliatory.
- Choose the core communicative motive from the target domain, grammar focus, and recent-task comparison first. Then use the required phrases as optional inspiration. A naturally relevant phrase may influence concrete details or the setting, but do not force all phrases into one situation or let the phrase set alone determine the learner's role, conflict, mission, or outcome.
- If you are unsure how an official, medical, legal, or other specialized process works, use a natural generic situation instead of inventing procedural details.
- Give the learner one clear mission, not a lesson plan or checklist.
- Vary the visible shape of the prompt across recent tasks. Natural options include one direct open question, a compact dilemma, a role-play opening, a story with one turning point, a request for advice, or a position to defend. Use the shape that best fits this task, and do not repeat the recent prompts' sentence rhythm or instruction pattern.
- Keep the scene warm, vivid, conversational, and under 300 characters.
- Never shorten a collocation, coordinated phrase, or sentence ending into unnatural English to meet the character limit. Every sentence must remain idiomatic and complete. If a draft is too long, remove a lower-priority detail or rewrite the sentence instead.
- Never use numbered steps, bullet points, parentheses, grammar terminology, or lists of example forms.
- Avoid repeatedly using classroom verbs such as "explain", "describe", and "finish with" as instructions. Prefer an inviting setup such as "Imagine...", "You're...", "Tell us...", or "What would you do?".
- When the focus is question formation, put the learner in a role where they must say their own questions.
- For hypothetical or regret focuses, make the counterfactual condition unmistakable.
- For a second-conditional focus, the scene itself must contain a natural "if" condition and "would", "could", or "might". Do not name the grammar construction.
- Before writing, compare the full recent tasks by the learner's main communicative goal, social role and level of agency, relationship to the listener, emotional dynamic, and interaction pattern. Choose a natural combination for the target domain and grammar that is least similar to those tasks.
- A change of setting alone is not enough. After drafting, silently replace the premise if its underlying goal, learner-listener relationship, or interaction pattern repeats a recent task. Vary how much agency the learner has instead of repeatedly placing them in the same social or emotional position.
- Do not print required phrases in the title or scene because the application displays them separately.
- Before returning the task, reject the draft if any requested past fact is absent from the setup or any participant reference has more than one possible meaning.
- Keep the title under 70 characters and avoid academic wording.`;

const TOPIC_GRADER_PROMPT = `You grade one generated English speaking-practice task.

Judge the title and speakingPrompt as a learner would see them. The supplied required phrases are displayed separately and are not required to appear or share a scenario.

Set each criterion strictly:
- coherentScenario: the setting, mission, requested details, and intended outcome form one realistic causal chain rather than a collage of unrelated ideas. Locations, movements, temporal references, and causes remain compatible from sentence to sentence; relative places and objects are anchored when their location matters to the causal chain; the learner is only asked to relate events they witnessed or were plausibly told about; and the grammar focus does not introduce facts that the setup never establishes.
- groundedSequenceAndReferences: independently trace the scene moment by moment. Set this to false if a mission-relevant movement lacks a reason, a place or object required to understand the task lacks a clear spatial anchor, a requested event is outside the learner's established knowledge, or a participant reference could match more than one person. Do not let overall plausibility compensate for a gap that makes the setup, requested response, or intended outcome ambiguous or contradictory. Do not fail for omitted incidental details that the learner does not need to complete the task.
- oneClearMission: the learner can immediately tell what single response or role-play to give.
- missionRelevantDetails: every requested detail helps complete that mission; no detail exists merely to echo an unrelated required phrase.
- requiredPhrasesNotForced: the scene does not awkwardly combine unrelated situations, objects, or decisions just to accommodate the required phrases.
- naturalAndConcrete: the task sounds like a plausible human situation and is concrete enough for a 1–3 minute answer. Its tone matches the intended social stakes: conditions describe benefits, trade-offs, or constructive next steps rather than using vague consequence-and-reaction wording that could sound threatening, punitive, or retaliatory.
- fluentAndComplete: every sentence uses idiomatic English and reaches a natural, grammatically complete ending. Fail wording that sounds shortened to fit the character limit, including coordination that drops a necessary head noun, such as using "budget and travel" when the intended meaning is "budget and travel needs".
- clearRolesAndContext: the setup uses natural connected prose rather than compressed headline-like facts; the learner's position is clear; any important participant has a specific relationship or role instead of a vague label such as "a guest", "someone", or "a person"; and any important limitation or unusual difficulty has an understandable cause rather than implying an unexplained broad inability.
- distinctUnderlyingPattern: compared with the recent tasks, the combination of main communicative goal, learner role and agency, listener relationship, emotional dynamic, and interaction pattern is materially different. A new setting with the same underlying interaction fails this criterion.
- variedPromptStructure: compared with the recent tasks, the prompt uses a materially different visible shape, sentence rhythm, or instruction pattern. Do not fail it merely for using a context-setting sentence, several requested details, or multiple speaking cues when they fit the mission naturally.

Do not fail a task because the required phrases are absent. Do fail a task that mashes together unrelated concepts without one convincing situation connecting them. Keep the reason concise and specific.`;

const ANSWER_EVALUATION_PROMPT = `You evaluate spoken English practice answers. The transcript is an immutable, verbatim record and the sole source of truth for language feedback.

Audit the answer in this order:
1. Read every sentence and identify every clear grammar or word-choice error. Check subject-verb agreement, tense and aspect, articles and determiners, prepositions and collocations, word forms, pronouns, clause structure, conditionals, and word order. Do not ignore an error merely because the meaning remains understandable.
2. Set substantiveSpeech to true when the learner develops at least one meaningful message, such as an event, opinion, request, explanation, decision, or story. The speech may be about any topic and may contain language errors. Set it to false when the response mainly names, reads, defines, translates, or paraphrases the required phrases; presents them as items to demonstrate; or makes meta-comments about satisfying or passing the task without developing a meaningful message.
3. Evaluate every required phrase independently. Locate natural inflections and substitutions for dictionary placeholders: a leading "to" is an infinitive marker, while sth/sb are semantic slots rather than literal words. Use the supplied definition to verify meaning.
4. Return concise, minimal corrections and one optional grammar priority.

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
- Mark used_correctly only when the phrase is recognizable, semantically appropriate for its definition, natural in context, grammatically correct within its sentence, and contributes meaning to substantive speech. The speech may be about any topic.
- Mark used_incorrectly whenever a recognizable occurrence is semantically wrong, grammatically broken, used in an unnatural construction, or merely named, listed, defined, translated, or presented as an item instead of contributing meaning to substantive speech. If any correction overlaps matchedText, status must be used_incorrectly. Never award credit based on how the occurrence could be corrected.
- Mark missed only when no recognizable occurrence exists.

grammarPriority is null when there is no useful grammar correction. Otherwise return the single most useful repeated or high-impact issue as a compact explanation and one correct example. Do not create a separate issue title or repeat the section heading in the explanation.

Topic relevance does not affect scoring. Any substantive speech can receive used_correctly credit; a non-substantive phrase list cannot. A phrase-list response can still receive ordinary grammar feedback. Do not generate vocabulary candidates, recommendations, or suggestions for what to learn next. telegramFeedback must be concise, must not quote the transcript or correction fragments, and must not contain markdown code fences.`;

export const ENGLISH_SPEAKING = {
  lifeDomains: LIFE_DOMAINS,
  grammarFocuses: GRAMMAR_FOCUSES,
  topicSystemPrompt: TOPIC_SYSTEM_PROMPT,
  topicGraderPrompt: TOPIC_GRADER_PROMPT,
  answerEvaluationPrompt: ANSWER_EVALUATION_PROMPT,
} satisfies SpeakingLanguageDefinition;
