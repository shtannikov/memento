import type OpenAI from "openai";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CZECH_LANGUAGE } from "@/languages/cz";
import { ENGLISH_LANGUAGE } from "@/languages/en";
import {
  areQuizSentencesTooSimilar,
  buildQuizPrompt,
  evaluateSpeakingAnswer,
  generateSpeakingTopic,
  generateQuizCards,
  gradeQuizCards,
  gradeSpeakingTopic,
  normalizeQuizSentence,
  validateGeneratedCards,
  type GenerationVocabularyItem,
  type GeneratedQuizCard,
} from "./openai";

const items: GenerationVocabularyItem[] = [
  { id: "1", term: "urge", definition: "Сильное внезапное желание." },
  { id: "2", term: "sedentary", definition: "Малоподвижный." },
  { id: "3", term: "leisurely", definition: "Неторопливый." },
  { id: "4", term: "savoury", definition: "Несладкий." },
];

const originalSpeakingEvaluationModel =
  process.env.OPENAI_SPEAKING_EVALUATION_MODEL;

afterEach(() => {
  if (originalSpeakingEvaluationModel === undefined) {
    delete process.env.OPENAI_SPEAKING_EVALUATION_MODEL;
  } else {
    process.env.OPENAI_SPEAKING_EVALUATION_MODEL =
      originalSpeakingEvaluationModel;
  }
});

describe("quiz generation contract", () => {
  it("keeps multilingual definitions in the prompt as semantic guidance", () => {
    const prompt = buildQuizPrompt(items);
    expect(prompt).toContain("definition may be in any language");
    expect(prompt).toContain("Сильное внезапное желание.");
    expect(prompt).toContain("natural English sentence");
  });

  it("uses a dedicated Czech prompt with Czech grammar constraints", () => {
    const prompt = buildQuizPrompt(
      [
        {
          id: "1",
          term: "čekat na někoho",
          definition: "to wait for someone",
        },
      ],
      [],
      "cz",
    );
    expect(prompt).toContain("target is always Czech");
    expect(prompt).toContain("case, person, number, gender");
    expect(prompt).toContain("reflexive particles se and si");
    expect(prompt).toContain("A particle may be in the visible sentence");
    expect(prompt).toContain("Jeho číslo si musím ___");
    expect(prompt).toContain("Mám jen jednu židli");
    expect(prompt).not.toContain("target is always English");
  });

  it("asks for natural displayed forms instead of literal dictionary notation", () => {
    const prompt = buildQuizPrompt([
      {
        id: "1",
        term: "to wrap up sth",
        definition: "Закончить что-либо.",
      },
    ]);
    expect(prompt).toContain(
      "Replacing ___ with answer must produce a complete, natural English sentence",
    );
    expect(prompt).toContain("Never display the literal text 'sth'");
    expect(prompt).not.toContain("Let's ___ the meeting before lunch.");
  });

  it("requires exact, grammatically complete substitution in every language", () => {
    const englishPrompt = buildQuizPrompt([
      {
        id: "1",
        term: "be offended",
        definition: "Feel hurt by criticism.",
      },
    ]);
    const czechPrompt = buildQuizPrompt(
      [
        {
          id: "1",
          term: "zapamatovat si",
          definition: "to remember",
        },
      ],
      [],
      "cz",
    );

    for (const prompt of [englishPrompt, czechPrompt]) {
      expect(prompt).toContain("final displayed replacement string");
      expect(prompt).toContain("Insert it into ___ exactly as written");
      expect(prompt).toContain("without any hidden transformation");
    }
    expect(englishPrompt).toContain(
      "Any visible auxiliary, modal, or negation must grammatically govern",
    );
    expect(englishPrompt).toContain("answer 'wasn't offended'");
    expect(englishPrompt).toContain("I didn't be offended");
    expect(czechPrompt).toContain(
      "never omit it or include it in both places",
    );
  });

  it("preserves required objects and avoids adding duplicate objects", () => {
    const prompt = buildQuizPrompt([
      {
        id: "1",
        term: "put on",
        definition: "Place clothing on your body.",
      },
      {
        id: "2",
        term: "do the laundry",
        definition: "Wash dirty clothes.",
      },
    ]);
    expect(prompt).toContain("Preserve the target's argument structure");
    expect(prompt).toContain("I need to ___ my coat");
    expect(prompt).toContain("never 'I need to ___ before we go outside'");
    expect(prompt).toContain("I need to ___ tonight");
    expect(prompt).toContain(
      "never 'I plan to ___ all the muddy clothes'",
    );
    expect(prompt).toContain(
      "Rewrite the surrounding sentence so the supplied target itself fits naturally",
    );
  });

  it("asks for a quick ambiguity check without expanding the output", () => {
    const prompt = buildQuizPrompt([
      {
        id: "1",
        term: "comb my hair",
        definition: "Make my hair neat with a comb.",
      },
      {
        id: "2",
        term: "get dressed",
        definition: "Put on clothes.",
      },
    ]);
    expect(prompt).toContain(
      "Quickly substitute all four options",
    );
    expect(prompt).toContain(
      "both 'comb my hair' and 'get dressed'",
    );
    expect(prompt).toContain(
      "'get dressed' may fit better",
    );
    expect(prompt).toContain(
      "equally natural or more likely",
    );
    expect(prompt).toContain("Preserve grammatical person and point of view");
    expect(prompt).toContain("must agree with the visible subject or speaker");
    expect(prompt).toContain("directly reject or reverse a preceding claim");
    expect(prompt).toContain("cannot merely introduce a contrast");
    expect(prompt).not.toContain("optionChecks");
    expect(prompt).not.toContain("visibleCue");
  });

  it("requires decisive Czech context when už competes with ještě", () => {
    const prompt = buildQuizPrompt(
      [
        { id: "1", term: "už", definition: "already; no longer" },
        { id: "2", term: "ještě", definition: "still; yet; another" },
      ],
      [],
      "cz",
    );

    expect(prompt).toContain("short adverbs with opposing time meanings");
    expect(prompt).toContain("decisive syntax and polarity cues");
    expect(prompt).toContain("do not rely on time-of-day words alone");
    expect(prompt).toContain("Do not repeat the target verb");
    expect(prompt).toContain("must occupy a valid infinitive position");
  });

  it("asks the semantic grader to reject missing and duplicate objects", async () => {
    const parse = vi.fn().mockResolvedValue({
      status: "completed",
      output_parsed: {
        evaluations: [],
        passed: false,
      },
    });
    const openai = { responses: { parse } } as unknown as OpenAI;

    await gradeQuizCards([], [], openai);

    const request = parse.mock.calls[0][0];
    const instructions = request.input[0].content;
    expect(instructions).toContain(
      "reject an obligatorily transitive expression used without its object",
    );
    expect(instructions).toContain(
      "reject an expression that already contains its object",
    );
    expect(instructions).toContain(
      "I need to put on before we go outside",
    );
    expect(instructions).toContain(
      "I plan to do the laundry all the muddy clothes",
    );
    expect(instructions).toContain(
      "Replace ___ with the displayed answer exactly as written",
    );
    expect(instructions).toContain("I didn't be offended");
  });

  it("asks the Czech grader to judge exact displayed substitution", async () => {
    const parse = vi.fn().mockResolvedValue({
      status: "completed",
      output_parsed: {
        evaluations: [],
        passed: false,
      },
    });
    const openai = { responses: { parse } } as unknown as OpenAI;

    await gradeQuizCards([], [], openai, "cz");

    const instructions = parse.mock.calls[0][0].input[0].content;
    expect(instructions).toContain(
      "Replace ___ with the displayed answer exactly as written",
    );
    expect(instructions).toContain(
      "exactly one correctly placed reflexive particle se/si",
    );
  });

  it("passes recent wording as forbidden context without translating definitions", () => {
    const prompt = buildQuizPrompt(items, [
      {
        vocabularyId: "1",
        sentence: "She felt an ___ to check her phone.",
      },
    ]);
    expect(prompt).toContain("do not reuse or closely paraphrase");
    expect(prompt).toContain("She felt an ___ to check her phone.");
    expect(prompt).toContain("Сильное внезапное желание.");
  });

  it("accepts a complete unambiguous card set", () => {
    const options = items.map((item) => item.term);
    const cards = items.map((item, index) => ({
      vocabularyId: item.id,
      sentence: `This is English context number ${index}: ___.`,
      answer: item.term,
      options,
    }));
    expect(validateGeneratedCards(items, cards)).toEqual(cards);
  });

  it("rejects duplicate IDs, ambiguous options, and missing blanks", () => {
    const options = ["urge", "urge", "leisurely", "savoury"];
    expect(() =>
      validateGeneratedCards(items, [
        {
          vocabularyId: "1",
          sentence: "There is no blank.",
          answer: "urge",
          options,
        },
      ]),
    ).toThrow("Couldn’t prepare");
  });

  it("normalizes cosmetic differences and rejects close paraphrases", () => {
    expect(normalizeQuizSentence("  Let's ___ now! ")).toBe(
      "let s blank now",
    );
    expect(
      areQuizSentencesTooSimilar(
        "The committee must ___ repair costs before approving the project.",
        "The committee must ___ the repair costs before approving the plan.",
      ),
    ).toBe(true);
    expect(
      areQuizSentencesTooSimilar(
        "She felt an ___ to check her phone.",
        "His sudden ___ to travel surprised everyone.",
      ),
    ).toBe(false);
  });

  it("rejects a recent sentence for the same vocabulary item only", () => {
    const cards = validCards();
    expect(() =>
      validateGeneratedCards(items, cards, [
        { vocabularyId: "1", sentence: cards[0].sentence.toUpperCase() },
      ]),
    ).toThrow("Couldn’t prepare");
    expect(
      validateGeneratedCards(items, cards, [
        { vocabularyId: "2", sentence: cards[0].sentence },
      ]),
    ).toEqual(cards);
  });

  it("retries once with the rejected wording added to forbidden context", async () => {
    const repeated = validCards();
    repeated[0] = {
      ...repeated[0],
      sentence: "She felt an ___ to check her phone.",
    };
    const fresh = alternateCards();
    const parse = vi
      .fn()
      .mockResolvedValueOnce(completedResponse(repeated))
      .mockResolvedValueOnce(completedResponse(fresh));
    const openai = { responses: { parse } } as unknown as OpenAI;

    await expect(
      generateQuizCards(items, 42, openai, [
        {
          vocabularyId: "1",
          sentence: "She felt an ___ to check her phone.",
        },
      ]),
    ).resolves.toEqual(fresh);
    expect(parse).toHaveBeenCalledTimes(2);
    expect(parse.mock.calls[0][0].reasoning).toEqual({ effort: "medium" });
    expect(
      JSON.stringify(parse.mock.calls[1][0].input),
    ).toContain("She felt an ___ to check her phone.");
  });

  it("fails after two invalid generations", async () => {
    const repeated = validCards();
    const history = [
      { vocabularyId: "1", sentence: repeated[0].sentence },
    ];
    const parse = vi
      .fn()
      .mockResolvedValue(completedResponse(repeated));
    const openai = { responses: { parse } } as unknown as OpenAI;

    await expect(
      generateQuizCards(items, 42, openai, history),
    ).rejects.toThrow("Couldn’t prepare");
    expect(parse).toHaveBeenCalledTimes(2);
  });

  it("uses exactly the approved starter vocabulary and short definitions", () => {
    expect(ENGLISH_LANGUAGE.starterVocabulary).toHaveLength(10);
    expect(ENGLISH_LANGUAGE.starterVocabulary.map((item) => item.term)).toEqual([
      "sedentary",
      "savoury",
      "leisurely",
      "intermission",
      "urge",
      "to wrap up sth",
      "to take sth into account",
      "to be in charge of sth",
      "on the contrary",
      "to a certain extent",
    ]);
    expect(
      ENGLISH_LANGUAGE.starterVocabulary.every(
        (item) => item.definition.length <= 30,
      ),
    ).toBe(true);
  });

  it("keeps Czech starters independent from the English app", () => {
    expect(CZECH_LANGUAGE.starterVocabulary).toHaveLength(10);
    expect(CZECH_LANGUAGE.starterVocabulary).toEqual([
      { term: "zapamatovat si", definition: "to remember" },
      { term: "zapomenout", definition: "to forget" },
      { term: "víc", definition: "more" },
      { term: "procházet se", definition: "to take a walk" },
      { term: "pohovka", definition: "sofa" },
      { term: "nábytek", definition: "furniture" },
      { term: "čekat na někoho", definition: "to wait for someone" },
      {
        term: "starat se o někoho",
        definition: "to take care of someone",
      },
      { term: "ještě", definition: "still; yet; another" },
      { term: "už", definition: "already; no longer" },
    ]);
    expect(
      ENGLISH_LANGUAGE.starterVocabulary.map((item) => item.term),
    ).not.toContain("zapamatovat si");
  });

  it("generates speaking topics from rotation and recent-history context", async () => {
    const parse = vi.fn().mockResolvedValue({
      status: "completed",
      output_parsed: {
        title: "A delayed appointment",
        speakingPrompt: "Ask the receptionist to find a practical alternative.",
      },
    });
    const openai = { responses: { parse } } as unknown as OpenAI;
    const input = {
      targetDomain: "public services and appointments",
      targetGrammarFocus: "polite requests and indirect questions",
      recentTopics: [{ topic: "A cancelled train", domain: "travel", grammarFocus: null }],
      recentLearnerExcerpts: ["I needed to change the time."],
      requiredPhrases: ["take into account"],
    };

    await expect(generateSpeakingTopic(input, 42, "en", openai)).resolves.toEqual({
      title: "A delayed appointment",
      speakingPrompt: "Ask the receptionist to find a practical alternative.",
      domain: input.targetDomain,
      grammarFocus: input.targetGrammarFocus,
    });
    expect(parse.mock.calls[0][0]).toMatchObject({ store: false });
    expect(JSON.stringify(parse.mock.calls[0][0].input)).toContain(
      "I needed to change the time.",
    );
    expect(ENGLISH_LANGUAGE.speaking?.topicSystemPrompt).toContain(
      "they do not all need to fit the scene",
    );
    expect(ENGLISH_LANGUAGE.speaking?.topicSystemPrompt).toContain(
      "form a realistic causal chain",
    );
  });

  it("grades forced combinations of unrelated practice phrases as incoherent", async () => {
    const parse = vi.fn().mockResolvedValue({
      status: "completed",
      output_parsed: {
        coherentScenario: false,
        oneClearMission: true,
        missionRelevantDetails: false,
        requiredPhrasesNotForced: false,
        naturalAndConcrete: true,
        reason: "The job offer is unrelated to the neighbourhood repair mission.",
      },
    });
    const openai = { responses: { parse } } as unknown as OpenAI;
    const input = {
      targetDomain: "housing and neighbourhood",
      targetGrammarFocus: "first conditional for realistic consequences",
      recentTopics: [],
      recentLearnerExcerpts: [],
      requiredPhrases: ["a splinter", "a dead-end job"],
    };
    const topic = {
      title: "A Better Block, A Better Future",
      speakingPrompt:
        "Welcome a neighbour, discuss hazards and a job offer, and make a plan.",
      domain: input.targetDomain,
      grammarFocus: input.targetGrammarFocus,
    };

    await expect(
      gradeSpeakingTopic(input, topic, 42, "en", openai),
    ).resolves.toMatchObject({
      coherentScenario: false,
      requiredPhrasesNotForced: false,
      passed: false,
    });
    expect(parse.mock.calls[0][0]).toMatchObject({
      store: false,
      reasoning: { effort: "low" },
    });
  });

  it("evaluates only required phrases and rejects invented vocabulary references", async () => {
    process.env.OPENAI_SPEAKING_EVALUATION_MODEL = "voice-evaluation-model";
    const output = {
      coverageScore: 80,
      taskRelevance: "on_topic",
      corrections: [],
      requiredPhraseUsage: [
        {
          vocabularyId: "701",
          phrase: "take into account",
          status: "used_correctly",
          evidence: "take into account the deadline",
        },
      ],
      grammarPriority: null,
      telegramFeedback: "Clear and well structured.",
    };
    const parse = vi.fn().mockResolvedValue({
      status: "completed",
      output_parsed: output,
    });
    const openai = { responses: { parse } } as unknown as OpenAI;
    const task = {
      id: "task-1",
      topic: "A deadline",
      domain: "work and career",
      grammarFocus: "polite requests and indirect questions",
      prompt: "Explain the change and ask for input.",
      items: [
        { vocabularyId: "701", term: "take into account", definition: "consider" },
      ],
    };

    await expect(
      evaluateSpeakingAnswer("We should take into account the deadline.", task, 42, "en", openai),
    ).resolves.toEqual(output);
    expect(parse.mock.calls[0][0].model).toBe("voice-evaluation-model");
    expect(JSON.stringify(parse.mock.calls[0][0].text?.format)).not.toContain(
      "rubric",
    );
    expect(ENGLISH_LANGUAGE.speaking?.answerEvaluationPrompt).toContain(
      "Do not generate vocabulary candidates, phrase recommendations",
    );
    expect(ENGLISH_LANGUAGE.speaking?.answerEvaluationPrompt).not.toContain(
      "language scores",
    );

    parse.mockResolvedValueOnce({
      status: "completed",
      output_parsed: {
        ...output,
        requiredPhraseUsage: [
          { ...output.requiredPhraseUsage[0], vocabularyId: "invented" },
        ],
      },
    });
    await expect(
      evaluateSpeakingAnswer("We should take it into account.", task, 42, "en", openai),
    ).rejects.toThrow("invalid vocabulary references");
  });
});

function validCards(): GeneratedQuizCard[] {
  const options = items.map((item) => item.term);
  return [
    {
      vocabularyId: "1",
      sentence: "She felt a sudden ___ to call home.",
      answer: "urge",
      options,
    },
    {
      vocabularyId: "2",
      sentence: "A desk job can make your routine increasingly ___.",
      answer: "sedentary",
      options,
    },
    {
      vocabularyId: "3",
      sentence: "They took a ___ walk along the river.",
      answer: "leisurely",
      options,
    },
    {
      vocabularyId: "4",
      sentence: "The café serves both sweet and ___ pastries.",
      answer: "savoury",
      options,
    },
  ];
}

function alternateCards(): GeneratedQuizCard[] {
  const options = items.map((item) => item.term);
  return [
    {
      vocabularyId: "1",
      sentence: "He resisted the ___ to open the gift early.",
      answer: "urge",
      options,
    },
    {
      vocabularyId: "2",
      sentence: "Doctors warned that her ___ lifestyle needed more movement.",
      answer: "sedentary",
      options,
    },
    {
      vocabularyId: "3",
      sentence: "Our hosts prepared breakfast at a ___ pace.",
      answer: "leisurely",
      options,
    },
    {
      vocabularyId: "4",
      sentence: "We ordered a ___ pie filled with vegetables.",
      answer: "savoury",
      options,
    },
  ];
}

function completedResponse(cards: GeneratedQuizCard[]) {
  return {
    status: "completed",
    output_parsed: { cards },
  };
}
