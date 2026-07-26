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
    expect(readVocabularyCommand("/reset")).toBe("reset");
    expect(readVocabularyCommand("/reset@MementoBot")).toBe("reset");
    expect(readVocabularyCommand("/reset\nunexpected")).toBeNull();
    expect(readVocabularyCommand("/unknown")).toBeNull();
  });

  it("parses plain, dashed, and bulleted lines while preserving descriptions", () => {
    expect(
      parseImportCommand(
        [
          "/import",
          "take sth into account - consider something",
          "- in charge - responsible - accountable",
          "• leisurely - relaxed",
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
        "Nothing was imported.",
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
