import {
  DEFINITION_MAX_LENGTH,
  IMPORT_MAX_ITEMS,
  TERM_MAX_LENGTH,
  type VocabularyInput,
} from "./vocabulary";

const IMPORT_COMMAND = /^\/import(?:@[a-z0-9_]+)?$/i;
const IMPORT_COMMAND_PREFIX = /^\/import(?:@[a-z0-9_]+)?(?=$|\s)/i;
const RESET_COMMAND = /^\/reset(?:@[a-z0-9_]+)?$/i;
const RESET_CONFIRM_COMMAND = /^\/reset(?:@[a-z0-9_]+)?\s+confirm$/i;
const HELP_COMMAND = /^\/help(?:@[a-z0-9_]+)?$/i;
const SPEAKING_COMMAND = /^\/speaking(?:@[a-z0-9_]+)?$/i;
const START_COMMAND = /^\/start(?:@[a-z0-9_]+)?(?:\s.*)?$/i;
const LIST_MARKER =
  /^(?:(?:[-*+•◦‣⁃∙·▪▫●○■□◆◇▶▷►▸➤➜–—]|[☐☑☒]|\[(?: |x|X)\])[ \t]?|(?:\d{1,3}[.)]|\(\d{1,3}\))[ \t])/u;
const ITEM_SEPARATOR = / (?:-|—) /u;
const IMPORT_FORMAT_ERROR =
  "⚠️ I couldn’t import that list.\n\n" +
  "Please use this format:\n" +
  "/import\n" +
  "• phrase — description\n" +
  "• phrase — description\n\n" +
  "☝️A few rules:\n" +
  `• A phrase can’t be longer than ${TERM_MAX_LENGTH} characters\n` +
  `• A description can’t be longer than ${DEFINITION_MAX_LENGTH} characters\n` +
  `• You can import up to ${IMPORT_MAX_ITEMS} phrases at a time\n\n` +
  "💡 <b>Tip:</b> ask ChatGPT to convert your vocabulary to this format before importing it.";
const EMPTY_IMPORT_HELP =
  "📥 Ready to add some phrases?\n\n" +
  "Send everything in one message using this format:\n\n" +
  "/import\n" +
  "• phrase — description\n" +
  "• phrase — description";

export type ImportParseResult =
  | { ok: true; items: VocabularyInput[] }
  | { ok: false; message: string; formatHelp?: true };

export type VocabularyCommand =
  | "help"
  | "import"
  | "reset"
  | "reset_confirm"
  | "start"
  | "speaking";

export function readVocabularyCommand(text: string): VocabularyCommand | null {
  const lines = normalizeLines(text);
  const firstLine = lines[0]?.trim() ?? "";

  if (IMPORT_COMMAND_PREFIX.test(firstLine)) return "import";
  if (lines.length === 1 && HELP_COMMAND.test(firstLine)) return "help";
  if (lines.length === 1 && SPEAKING_COMMAND.test(firstLine)) {
    return "speaking";
  }
  if (lines.length === 1 && RESET_CONFIRM_COMMAND.test(firstLine)) {
    return "reset_confirm";
  }
  if (lines.length === 1 && RESET_COMMAND.test(firstLine)) return "reset";
  if (lines.length === 1 && START_COMMAND.test(firstLine)) return "start";
  return null;
}

export function parseImportCommand(text: string): ImportParseResult {
  const lines = normalizeLines(text);
  const firstLine = lines[0]?.trim() ?? "";
  if (!IMPORT_COMMAND.test(firstLine)) {
    return invalidFormat();
  }

  const itemLines = lines
    .slice(1)
    .map((value, index) => ({ value, lineNumber: index + 2 }))
    .filter(({ value }) => value.trim().length > 0);

  if (itemLines.length === 0) {
    return { ok: false, message: EMPTY_IMPORT_HELP };
  }
  if (itemLines.length > IMPORT_MAX_ITEMS) {
    return {
      ok: false,
      message:
        `⚠️ That list has more than ${IMPORT_MAX_ITEMS} phrases. ` +
        `Send up to ${IMPORT_MAX_ITEMS} at a time. Nothing was imported.`,
    };
  }

  const items: VocabularyInput[] = [];
  const normalizedTerms = new Set<string>();

  for (const { value, lineNumber } of itemLines) {
    const withoutBullet = value.trimStart().replace(LIST_MARKER, "");
    const separator = ITEM_SEPARATOR.exec(withoutBullet);
    if (!separator) {
      return invalidFormat();
    }

    const term = withoutBullet.slice(0, separator.index).trim();
    const definition = withoutBullet
      .slice(separator.index + separator[0].length)
      .trim();

    if (!term) return invalidFormat();
    if (!definition) {
      return invalidFormat();
    }
    if (term.length > TERM_MAX_LENGTH) {
      return invalidImport(
        `⚠️ Phrase on line ${lineNumber} is too long. ` +
          `Keep it to ${TERM_MAX_LENGTH} characters or fewer. ` +
          "Nothing was imported.",
      );
    }
    if (definition.length > DEFINITION_MAX_LENGTH) {
      return invalidImport(
        `⚠️ Description on line ${lineNumber} is too long. ` +
          `Keep it to ${DEFINITION_MAX_LENGTH} characters or fewer. ` +
          "Nothing was imported.",
      );
    }

    const normalizedTerm = term.toLowerCase();
    if (normalizedTerms.has(normalizedTerm)) {
      return invalidImport(
        `⚠️ The phrase “${term}” appears more than once. Nothing was imported.`,
      );
    }
    normalizedTerms.add(normalizedTerm);
    items.push({ term, definition });
  }

  return { ok: true, items };
}

function normalizeLines(text: string): string[] {
  return text.replace(/\r\n?/g, "\n").split("\n");
}

function invalidFormat(): ImportParseResult {
  return { ok: false, message: IMPORT_FORMAT_ERROR, formatHelp: true };
}

function invalidImport(message: string): ImportParseResult {
  return { ok: false, message };
}
