type WordToken = {
  leading: string;
  text: string;
};

type DiffPart = {
  kind: "equal" | "delete" | "insert";
  tokens: WordToken[];
};

export function formatInlineCorrection(
  original: string,
  corrected: string,
): string {
  const parts = diffWords(tokenize(original), tokenize(corrected));
  let html = "";

  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    if (part.kind === "equal") {
      html += renderTokens(part.tokens);
      continue;
    }

    const followsDeletion =
      part.kind === "insert" && parts[index - 1]?.kind === "delete";
    const tag = part.kind === "delete" ? "s" : "b";
    html += renderChangedTokens(
      part.tokens,
      tag,
      followsDeletion ? " " : undefined,
      followsDeletion,
    );
  }

  return html;
}

function tokenize(value: string): WordToken[] {
  const tokens: WordToken[] = [];
  const pattern = /(\s*)(\S+)/g;
  for (const match of value.matchAll(pattern)) {
    tokens.push({ leading: match[1], text: match[2] });
  }
  return tokens;
}

function diffWords(original: WordToken[], corrected: WordToken[]): DiffPart[] {
  const lengths = Array.from(
    { length: original.length + 1 },
    () => Array<number>(corrected.length + 1).fill(0),
  );

  for (let i = original.length - 1; i >= 0; i -= 1) {
    for (let j = corrected.length - 1; j >= 0; j -= 1) {
      lengths[i][j] = sameWord(original[i], corrected[j])
        ? lengths[i + 1][j + 1] + 1
        : Math.max(lengths[i + 1][j], lengths[i][j + 1]);
    }
  }

  const parts: DiffPart[] = [];
  const append = (kind: DiffPart["kind"], token: WordToken) => {
    const last = parts.at(-1);
    if (last?.kind === kind) last.tokens.push(token);
    else parts.push({ kind, tokens: [token] });
  };

  let i = 0;
  let j = 0;
  while (i < original.length && j < corrected.length) {
    if (sameWord(original[i], corrected[j])) {
      append("equal", original[i]);
      i += 1;
      j += 1;
    } else if (lengths[i + 1][j] >= lengths[i][j + 1]) {
      append("delete", original[i]);
      i += 1;
    } else {
      append("insert", corrected[j]);
      j += 1;
    }
  }
  while (i < original.length) {
    append("delete", original[i]);
    i += 1;
  }
  while (j < corrected.length) {
    append("insert", corrected[j]);
    j += 1;
  }
  return parts;
}

function sameWord(left: WordToken, right: WordToken): boolean {
  const leftWord = normalizeWord(left.text);
  const rightWord = normalizeWord(right.text);
  if (!leftWord || !rightWord) {
    return left.text.toLocaleLowerCase("en") ===
      right.text.toLocaleLowerCase("en");
  }
  return leftWord === rightWord;
}

function renderTokens(tokens: WordToken[]): string {
  return tokens.map((token) => escapeHtml(token.leading + token.text)).join("");
}

function renderChangedTokens(
  tokens: WordToken[],
  tag: "s" | "b",
  firstLeading?: string,
  omitBoundaryPunctuation = false,
): string {
  const leading = firstLeading ?? tokens[0]?.leading ?? "";
  const content = tokens
    .map((token, index) =>
      index === 0 ? token.text : token.leading + token.text
    )
    .join("");
  const characters = Array.from(content);
  const firstWordCharacter = characters.findIndex(isWordCharacter);
  if (firstWordCharacter === -1) return "";

  const lastWordCharacter = characters.findLastIndex(isWordCharacter);
  const prefix = omitBoundaryPunctuation
    ? ""
    : characters.slice(0, firstWordCharacter).join("");
  const words = characters.slice(firstWordCharacter, lastWordCharacter + 1)
    .join("");
  const suffix = omitBoundaryPunctuation
    ? ""
    : characters.slice(lastWordCharacter + 1).join("");
  return `${escapeHtml(leading + prefix)}<${tag}>${escapeHtml(words)}</${tag}>${escapeHtml(suffix)}`;
}

function normalizeWord(value: string): string {
  return Array.from(value)
    .filter(isWordCharacter)
    .join("")
    .toLocaleLowerCase("en");
}

function isWordCharacter(character: string): boolean {
  return /[\p{L}\p{N}]/u.test(character);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
