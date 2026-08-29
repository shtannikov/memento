import type { EvalCase, SpeakingEvalCase } from "../../../../tooling/evals/types";
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
      "Chooses a distinct underlying public-service interaction instead of reskinning recent goals, while using negative practice phrases only when natural.",
    appId: "en",
    input: {
      targetDomain: "public services and appointments",
      targetGrammarFocus: "past narration with tense contrast",
      recentTasks: [
        {
          title: "A New Role at Work",
          speakingPrompt:
            "You are in a friendly interview. Say how your responsibilities changed, what you handled, and when you felt ready to move.",
          domain: "work and career",
          grammarFocus: "present perfect for experiences and change",
        },
        {
          title: "A Second Chance at Your Course",
          speakingPrompt:
            "You missed an important application deadline. Explain what went wrong, apologize to your mentor, and ask whether you can apply again.",
          domain: "education and personal growth",
          grammarFocus: "third conditional and wish for past regrets",
        },
        {
          title: "Book the Right Physiotherapy Appointment",
          speakingPrompt:
            "Call a physiotherapy clinic, ask about the available services, and choose a suitable appointment.",
          domain: "health and wellbeing",
          grammarFocus: "polite requests and indirect questions",
        },
        {
          title: "Choose a Venue for a Welcome Meet-Up",
          speakingPrompt:
            "Compare two local venues and recommend the better place for a neighbourhood event.",
          domain: "community and social situations",
          grammarFocus: "comparisons and language of preference",
        },
        {
          title: "A Restaurant for Your Team",
          speakingPrompt:
            "Retell what two restaurant managers said and decide where your team should have dinner.",
          domain: "restaurants and food",
          grammarFocus: "reported speech for retelling conversations",
        },
        {
          title: "Choose a New Hobby Class",
          speakingPrompt:
            "Compare an evening pottery class with a weekend photography class and tell a friend which one you would choose.",
          domain: "preferences and personal choices",
          grammarFocus: "first conditional for realistic consequences",
        },
      ],
      requiredPhrases: ["to scold", "to be offended", "a fine"],
    },
  },
  {
    kind: "topic",
    id: "speaking-topic-varies-prompt-structure",
    description:
      "Varies the visible prompt shape instead of repeating the structure of recent tasks.",
    appId: "en",
    input: {
      targetDomain: "preferences and personal choices",
      targetGrammarFocus: "comparisons and language of preference",
      recentTasks: [
        {
          title: "A New Job",
          speakingPrompt:
            "You are talking to a manager. Say how your role changed, what you learned, and when you became ready.",
          domain: "work and career",
          grammarFocus: "present perfect for experiences and change",
        },
        {
          title: "A Torn Jacket",
          speakingPrompt:
            "A customer returns a jacket. Explain what happened, what they were doing, and what you will do next.",
          domain: "shopping and consumer situations",
          grammarFocus: "past narration with tense contrast",
        },
        {
          title: "A Noisy Neighbour",
          speakingPrompt:
            "Call the landlord. Report what the neighbour said, what they promised, and when you will follow up.",
          domain: "housing and neighbourhood",
          grammarFocus: "reported speech for retelling conversations",
        },
      ],
      requiredPhrases: ["for a change", "to wrap up sth"],
    },
  },
  {
    kind: "topic",
    id: "speaking-topic-grounds-roles-and-context",
    description:
      "Uses natural connected context, makes participant relationships clear, and explains unusual difficulties such as being unable to follow an English menu.",
    appId: "en",
    input: {
      targetDomain: "restaurants and food",
      targetGrammarFocus: "polite requests and indirect questions",
      recentTasks: [],
      requiredPhrases: ["used to +inf", "to be used to sth", "to take off"],
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
      recentTasks: [
        {
          title: "A community repair day",
          speakingPrompt:
            "Help neighbours plan a repair day and decide what everyone should bring.",
          domain: "community and social situations",
          grammarFocus: "first conditional for realistic consequences",
        },
      ],
      requiredPhrases: ["a splinter", "a dead-end job"],
    },
  },
  {
    kind: "topic",
    id: "speaking-topic-tracks-space-and-time",
    description:
      "Keeps locations, movements, chronology, and narrator knowledge coherent in a past-narration scene.",
    appId: "en",
    input: {
      targetDomain: "housing and neighbourhood",
      targetGrammarFocus: "past narration with tense contrast",
      recentTasks: [],
      requiredPhrases: ["under the name", "to pick up sth", "in any case"],
    },
  },
  {
    kind: "topic",
    id: "speaking-topic-conditionals-stay-constructive",
    description:
      "Frames realistic consequences and contingency plans as helpful actions rather than vague threats or retaliation.",
    appId: "en",
    input: {
      targetDomain: "entertainment and culture",
      targetGrammarFocus: "first conditional for realistic consequences",
      recentTasks: [],
      requiredPhrases: ["under the name", "to pick up sth", "in any case"],
    },
  },
  {
    kind: "topic",
    id: "speaking-topic-keeps-wording-fluent-under-limit",
    description:
      "Keeps collocations, coordinated phrases, and sentence endings idiomatic instead of compressing them to fit the prompt limit.",
    appId: "en",
    input: {
      targetDomain: "technology and online life",
      targetGrammarFocus: "comparisons and language of preference",
      recentTasks: [],
      requiredPhrases: ["used to +inf", "to be used to sth", "to take off"],
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
