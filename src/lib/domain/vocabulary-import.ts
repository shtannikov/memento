import {
  DEFINITION_MAX_LENGTH,
  IMPORT_MAX_ITEMS,
  TERM_MAX_LENGTH,
  type VocabularyInput,
} from "./vocabulary";

const IMPORT_COMMAND = /^\/import(?:@[a-z0-9_]+)?$/i;
const IMPORT_COMMAND_PREFIX = /^\/import(?:@[a-z0-9_]+)?(?=$|\s)/i;
const RESET_COMMAND = /^\/reset(?:@[a-z0-9_]+)?$/i;
const LIST_MARKER =
  /^(?:(?:[-*+•◦‣⁃∙·▪▫●○■□◆◇▶▷►▸➤➜–—]|[☐☑☒]|\[(?: |x|X)\])[ \t]?|(?:\d{1,3}[.)]|\(\d{1,3}\))[ \t])/u;
const IMPORT_FORMAT_HELP =
  "\n\nUse this format:\n" +
  "/import\n" +
  "phrase - description\n" +
  "phrase - description\n\n" +
  "Tip: ask ChatGPT to convert your vocabulary to this format before importing it.";

export type ImportParseResult =
  | { ok: true; items: VocabularyInput[] }
  | { ok: false; message: string };

export type VocabularyCommand = "import" | "reset";

export function readVocabularyCommand(text: string): VocabularyCommand | null {
  const lines = normalizeLines(text);
  const firstLine = lines[0]?.trim() ?? "";

  if (IMPORT_COMMAND_PREFIX.test(firstLine)) return "import";
  if (lines.length === 1 && RESET_COMMAND.test(firstLine)) return "reset";
  return null;
}

export function parseImportCommand(text: string): ImportParseResult {
  const lines = normalizeLines(text);
  const firstLine = lines[0]?.trim() ?? "";
  if (!IMPORT_COMMAND.test(firstLine)) {
    return invalidImport(
      IMPORT_COMMAND_PREFIX.test(firstLine)
        ? "put /import on its own first line"
        : "use /import on the first line",
    );
  }

  const itemLines = lines
    .slice(1)
    .map((value, index) => ({ value, lineNumber: index + 2 }))
    .filter(({ value }) => value.trim().length > 0);

  if (itemLines.length === 0) {
    return invalidImport("add at least one phrase");
  }
  if (itemLines.length > IMPORT_MAX_ITEMS) {
    return {
      ok: false,
      message:
        `Import failed: you can import up to ${IMPORT_MAX_ITEMS} phrases ` +
        "at a time. Nothing was imported.",
    };
  }

  const items: VocabularyInput[] = [];
  const normalizedTerms = new Set<string>();

  for (const { value, lineNumber } of itemLines) {
    const withoutBullet = value.trimStart().replace(LIST_MARKER, "");
    const separatorIndex = withoutBullet.indexOf(" - ");
    if (separatorIndex < 0) {
      return invalidImport(
        'use the format "phrase - description"',
        lineNumber,
      );
    }

    const term = withoutBullet.slice(0, separatorIndex).trim();
    const definition = withoutBullet
      .slice(separatorIndex + 3)
      .trim();

    if (!term) return invalidImport("phrase cannot be empty", lineNumber);
    if (!definition) {
      return invalidImport("description cannot be empty", lineNumber);
    }
    if (term.length > TERM_MAX_LENGTH) {
      return invalidImport(
        `phrase must be ${TERM_MAX_LENGTH} characters or fewer`,
        lineNumber,
      );
    }
    if (definition.length > DEFINITION_MAX_LENGTH) {
      return invalidImport(
        `description must be ${DEFINITION_MAX_LENGTH} characters or fewer`,
        lineNumber,
      );
    }

    const normalizedTerm = term.toLowerCase();
    if (normalizedTerms.has(normalizedTerm)) {
      return invalidImport("phrase is duplicated in this import", lineNumber);
    }
    normalizedTerms.add(normalizedTerm);
    items.push({ term, definition });
  }

  return { ok: true, items };
}

function normalizeLines(text: string): string[] {
  return text.replace(/\r\n?/g, "\n").split("\n");
}

function invalidImport(reason: string, lineNumber?: number): ImportParseResult {
  const location = lineNumber ? ` on line ${lineNumber}` : "";
  return {
    ok: false,
    message:
      `Import failed${location}: ${reason}. Nothing was imported.` +
      IMPORT_FORMAT_HELP,
  };
}
