import { describe, expect, it } from "vitest";

import { STARTER_VOCABULARY } from "@/lib/domain/starter-vocabulary";
import {
  buildQuizPrompt,
  validateGeneratedCards,
  type GenerationVocabularyItem,
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
    expect(prompt).toContain("answer 'wrap up'");
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
});
