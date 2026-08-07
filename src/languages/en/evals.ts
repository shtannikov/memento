import type { EvalCase, SpeakingEvalCase } from "../../../evals/types";
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
    id: "auxiliary-compatible-answer-forms",
    description:
      "Produces a grammatical sentence after exact answer substitution, including when be offended requires a compatible auxiliary and negation.",
    appId: ENGLISH_LANGUAGE.id,
    items: [
      {
        id: "151",
        term: "break a sweat",
        definition: "Make a noticeable physical effort.",
      },
      {
        id: "152",
        term: "start over",
        definition: "Begin again from the beginning.",
      },
      {
        id: "153",
        term: "be offended",
        definition: "Feel hurt or upset by someone's words or actions.",
      },
      {
        id: "154",
        term: "take advantage of",
        definition: "Use an opportunity for your benefit.",
      },
    ],
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

const speakingTask = {
  id: "00000000-0000-0000-0000-000000000001",
  topic: "Changing a team plan",
  domain: "work and collaboration",
  grammarFocus: "polite requests and indirect questions",
  prompt:
    "Tell a teammate why the plan must change, ask for their input, and agree on the next step.",
  items: [
    { vocabularyId: "701", term: "take into account", definition: "consider" },
    { vocabularyId: "702", term: "be responsible for", definition: "have responsibility" },
    { vocabularyId: "703", term: "wrap up", definition: "finish" },
  ],
};

export const SPEAKING_EVAL_CASES: SpeakingEvalCase[] = [
  {
    kind: "topic",
    id: "speaking-topic-coherence",
    description:
      "Creates one coherent public-service scenario around the selected domain, grammar focus, and required phrases.",
    appId: "en",
    input: {
      targetDomain: "public services and civic life",
      targetGrammarFocus: "polite requests and indirect questions",
      previousTask: {
        title: "Changing a project deadline",
        speakingPrompt:
          "Ask a teammate to move a deadline and agree on a revised plan.",
        domain: "work and career",
        grammarFocus: "future plans and predictions",
      },
      recentTopics: [
        { topic: "Returning a purchase", domain: "shopping", grammarFocus: null },
      ],
      recentLearnerExcerpts: [
        "I had to explain why the appointment time did not work for me.",
      ],
      requiredPhrases: ["take into account", "be responsible for", "wrap up"],
    },
  },
  {
    kind: "topic",
    id: "speaking-topic-unrelated-phrases-stay-coherent",
    description:
      "Keeps one natural mission when the separate practice phrases do not belong to a shared scenario.",
    appId: "en",
    input: {
      targetDomain: "housing and neighbourhood",
      targetGrammarFocus: "first conditional for realistic consequences",
      recentTopics: [
        {
          topic: "A community repair day",
          domain: "community and social situations",
          grammarFocus: "first conditional for realistic consequences",
        },
      ],
      recentLearnerExcerpts: [],
      requiredPhrases: ["a splinter", "a dead-end job"],
    },
  },
  {
    kind: "answer",
    id: "speaking-answer-required-phrase-statuses",
    description:
      "Distinguishes correct, incorrect, and missing required-phrase usage without generating recommendations.",
    appId: "en",
    task: speakingTask,
    transcript:
      "Could you tell me whether we can change the plan? We need to take into account the new deadline. I am responsible of the final report, so I would value your input.",
    expectedUsage: {
      "701": "used_correctly",
      "702": "used_incorrectly",
      "703": "missed",
    },
  },
  {
    kind: "answer",
    id: "speaking-answer-grammar-and-phrase-accuracy",
    description:
      "Finds clear grammar errors throughout the transcript and rejects grammatically broken required phrases.",
    appId: "en",
    task: speakingTask,
    transcript:
      "Yesterday I go to the office. I am responsible of the final report. We didn't took the deadline into account, and then we wrap up the meeting.",
    expectedUsage: {
      "701": "used_incorrectly",
      "702": "used_incorrectly",
      "703": "used_incorrectly",
    },
    expectedCorrectionFragments: [
      "I go",
      "responsible of",
      "didn't took",
      "we wrap up",
    ],
    expectGrammarPriority: true,
  },
  {
    kind: "answer",
    id: "speaking-answer-rejects-phrase-list-cheating",
    description:
      "Rejects a list of definitions and meta-commentary instead of treating isolated phrase mentions as speaking practice.",
    appId: "en",
    task: speakingTask,
    transcript:
      "First, take into account means consider. Second, be responsible for means have responsibility. And third, wrap up means finish. I hope that's enough to pass this task.",
    expectedUsage: {
      "701": "used_incorrectly",
      "702": "used_incorrectly",
      "703": "used_incorrectly",
    },
    expectedSubstantiveSpeech: false,
  },
  {
    kind: "answer",
    id: "speaking-answer-allows-any-substantive-topic",
    description:
      "Awards natural phrase usage in connected speech even when it does not answer the supplied scene.",
    appId: "en",
    task: speakingTask,
    transcript:
      "Last weekend our family trip went wrong. We had to take into account the heavy rain, and I was responsible for finding a hotel. Once everyone was safe indoors, we wrapped up the evening with dinner.",
    expectedUsage: {
      "701": "used_correctly",
      "702": "used_correctly",
      "703": "used_correctly",
    },
    expectedSubstantiveSpeech: true,
  },
];
