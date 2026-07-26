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
    expect(parseImportCommand("phrase - description")).toMatchObject({
      ok: false,
      message: expect.stringContaining("use /import"),
    });
    expect(parseImportCommand("/import\n\n")).toMatchObject({
      ok: false,
      message: expect.stringContaining("at least one"),
    });
    expect(parseImportCommand("/import\nphrase-description")).toEqual({
      ok: false,
      message:
        'Import failed on line 2: use the format "phrase - description". ' +
        "Nothing was imported.\n\n" +
        "Use this format:\n" +
        "/import\n" +
        "phrase - description\n" +
        "phrase - description\n\n" +
        "Tip: ask ChatGPT to convert your vocabulary to this format before importing it.",
    });
    expect(parseImportCommand("/import x")).toMatchObject({
      ok: false,
      message: expect.stringContaining("put /import on its own first line"),
    });
  });

  it("rejects empty and overlong values with the source line number", () => {
    expect(parseImportCommand("/import\n•  - definition")).toMatchObject({
      ok: false,
      message: expect.stringContaining("phrase cannot be empty"),
    });
    expect(parseImportCommand("/import\nphrase - ")).toMatchObject({
      ok: false,
      message: expect.stringContaining("description cannot be empty"),
    });
    expect(
      parseImportCommand(`/import\n${"p".repeat(36)} - definition`),
    ).toMatchObject({
      ok: false,
      message: expect.stringContaining("35 characters"),
    });
    expect(
      parseImportCommand(`/import\nphrase - ${"d".repeat(46)}`),
    ).toMatchObject({
      ok: false,
      message: expect.stringContaining("45 characters"),
    });
  });

  it("accepts the exact length boundaries", () => {
    const result = parseImportCommand(
      `/import\n${"p".repeat(35)} - ${"d".repeat(45)}`,
    );
    expect(result).toMatchObject({ ok: true });
  });

  it("rejects case-insensitive duplicates and more than 50 items", () => {
    expect(
      parseImportCommand("/import\nLeisurely - relaxed\nleisurely - slowly"),
    ).toMatchObject({
      ok: false,
      message: expect.stringContaining("duplicated"),
    });

    const tooMany = Array.from(
      { length: 51 },
      (_, index) => `phrase ${index} - definition ${index}`,
    );
    expect(parseImportCommand(["/import", ...tooMany].join("\n"))).toEqual({
      ok: false,
      message:
        "Import failed: you can import up to 50 phrases at a time. " +
        "Nothing was imported.",
    });
  });
});
