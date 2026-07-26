import { describe, expect, it } from "vitest";

import {
  parseImportCommand,
  readVocabularyCommand,
} from "./vocabulary-import";

describe("vocabulary import commands", () => {
  it("recognizes supported commands and bot mentions", () => {
    expect(readVocabularyCommand("/import\nphrase - description")).toBe(
      "import",
    );
    expect(readVocabularyCommand("/import@MementoBot\r\nx - y")).toBe(
      "import",
    );
    expect(readVocabularyCommand("/import x")).toBe("import");
    expect(readVocabularyCommand("/import@MementoBot x")).toBe("import");
    expect(readVocabularyCommand("/imported x")).toBeNull();
    expect(readVocabularyCommand("/reset")).toBe("reset");
    expect(readVocabularyCommand("/reset@MementoBot")).toBe("reset");
    expect(readVocabularyCommand("/reset\nunexpected")).toBeNull();
    expect(readVocabularyCommand("/unknown")).toBeNull();
  });

  it("parses plain and marked list lines while preserving descriptions", () => {
    expect(
      parseImportCommand(
        [
          "/import",
          "take sth into account - consider something",
          "- in charge - responsible - accountable",
          "• leisurely - relaxed",
          "• make up — invent",
          "* figure out - understand",
          "+ carry on - continue",
          "◦ put off - postpone",
          "▪ come across - encounter",
          "— point out - indicate",
          "1. look after - take care of",
          "2) bring up - mention",
          "(3) turn down - reject",
          "[ ] set up - arrange",
          "[x] work out - solve",
          "☑ give up - stop trying",
          "",
        ].join("\r\n"),
      ),
    ).toEqual({
      ok: true,
      items: [
        {
          term: "take sth into account",
          definition: "consider something",
        },
        {
          term: "in charge",
          definition: "responsible - accountable",
        },
        { term: "leisurely", definition: "relaxed" },
        { term: "make up", definition: "invent" },
        { term: "figure out", definition: "understand" },
        { term: "carry on", definition: "continue" },
        { term: "put off", definition: "postpone" },
        { term: "come across", definition: "encounter" },
        { term: "point out", definition: "indicate" },
        { term: "look after", definition: "take care of" },
        { term: "bring up", definition: "mention" },
        { term: "turn down", definition: "reject" },
        { term: "set up", definition: "arrange" },
        { term: "work out", definition: "solve" },
        { term: "give up", definition: "stop trying" },
      ],
    });
  });

  it("requires the command, at least one item, and the exact separator", () => {
    const formatError = {
      ok: false,
      message:
        "⚠️ I couldn’t import that list. Nothing was imported.\n\n" +
        "Please use this format:\n" +
        "/import\n" +
        "• phrase - description\n" +
        "• phrase — description\n\n" +
        "✨ A few rules:\n" +
        "• A phrase can’t be longer than 35 characters\n" +
        "• A description can’t be longer than 45 characters\n" +
        "• You can import up to 50 phrases at a time\n\n" +
        "💡 Tip: ask ChatGPT to convert your vocabulary to this format before importing it.",
    };

    expect(parseImportCommand("phrase - description")).toEqual(formatError);
    expect(parseImportCommand("/import\n\n")).toEqual(formatError);
    expect(parseImportCommand("/import\nphrase-description")).toEqual(
      formatError,
    );
    expect(parseImportCommand("/import x")).toEqual(formatError);
  });

  it("rejects empty and overlong values with the source line number", () => {
    expect(parseImportCommand("/import\n•  - definition")).toMatchObject({
      ok: false,
      message: expect.stringContaining("couldn’t import that list"),
    });
    expect(parseImportCommand("/import\nphrase - ")).toMatchObject({
      ok: false,
      message: expect.stringContaining("couldn’t import that list"),
    });

    const longPhrase = parseImportCommand(
      `/import\n${"p".repeat(36)} - definition`,
    );
    expect(longPhrase).toMatchObject({
      ok: false,
      message:
        "⚠️ Phrase on line 2 is too long. Keep it to 35 characters or fewer. " +
        "Nothing was imported.",
    });
    if (longPhrase.ok) throw new Error("Expected validation error");
    expect(longPhrase.message).not.toContain("Please use this format");

    const longDescription = parseImportCommand(
      `/import\nphrase - ${"d".repeat(46)}`,
    );
    expect(longDescription).toMatchObject({
      ok: false,
      message:
        "⚠️ Description on line 2 is too long. Keep it to 45 characters or fewer. " +
        "Nothing was imported.",
    });
    if (longDescription.ok) throw new Error("Expected validation error");
    expect(longDescription.message).not.toContain("Please use this format");
  });

  it("accepts the exact length boundaries", () => {
    const result = parseImportCommand(
      `/import\n${"p".repeat(35)} - ${"d".repeat(45)}`,
    );
    expect(result).toMatchObject({ ok: true });
  });

  it("rejects case-insensitive duplicates and more than 50 items", () => {
    const duplicate = parseImportCommand(
      "/import\nLeisurely - relaxed\nleisurely - slowly",
    );
    expect(duplicate).toMatchObject({
      ok: false,
      message:
        "⚠️ The phrase on line 3 appears more than once. " +
        "Nothing was imported.",
    });
    if (duplicate.ok) throw new Error("Expected validation error");
    expect(duplicate.message).not.toContain("Please use this format");

    const tooMany = Array.from(
      { length: 51 },
      (_, index) => `phrase ${index} - definition ${index}`,
    );
    expect(parseImportCommand(["/import", ...tooMany].join("\n"))).toEqual({
      ok: false,
      message:
        "⚠️ That list has more than 50 phrases. " +
        "Send up to 50 at a time. Nothing was imported.",
    });
  });
});
