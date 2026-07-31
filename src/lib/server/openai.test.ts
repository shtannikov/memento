import type OpenAI from "openai";
import { describe, expect, it, vi } from "vitest";

import {
  CZECH_STARTER_VOCABULARY,
  STARTER_VOCABULARY,
} from "@/lib/domain/starter-vocabulary";
import {
  areQuizSentencesTooSimilar,
  buildQuizPrompt,
  generateQuizCards,
  gradeQuizCards,
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
          term: "těšit se na něco",
          definition: "Look forward to something.",
        },
      ],
      [],
      "cz",
    );
    expect(prompt).toContain("target is always Czech");
    expect(prompt).toContain("case, person, number, gender");
    expect(prompt).toContain("reflexive particles se and si");
    expect(prompt).toContain("Už se ___ víkend");
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
    expect(prompt).not.toContain("optionChecks");
    expect(prompt).not.toContain("visibleCue");
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
    expect(STARTER_VOCABULARY).toHaveLength(10);
    expect(STARTER_VOCABULARY.map((item) => item.term)).toEqual([
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
      STARTER_VOCABULARY.every((item) => item.definition.length <= 30),
    ).toBe(true);
  });

  it("keeps Czech starters independent from the English app", () => {
    expect(CZECH_STARTER_VOCABULARY).toHaveLength(10);
    expect(CZECH_STARTER_VOCABULARY.map((item) => item.term)).toContain(
      "těšit se na něco",
    );
    expect(STARTER_VOCABULARY.map((item) => item.term)).not.toContain(
      "těšit se na něco",
    );
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
