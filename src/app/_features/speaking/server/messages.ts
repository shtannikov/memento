import type {
  AnswerEvaluation,
  SpeakingTask,
} from "../domain";
import { formatInlineCorrection } from "./inline-correction";

export const NON_SUBSTANTIVE_SPEAKING_FEEDBACK =
  "To practice these phrases effectively, use them to tell a short story, share an opinion, or describe something. Just listing them isn’t enough, so I can’t count this attempt yet 🙁";

export function buildSpeakingTaskMessage(task: SpeakingTask): string {
  const phrases = task.items
    .map((item) => `• <i>${escapeHtml(item.term)}</i>`)
    .join("\n");
  return [
    "🎯 <b>Your new speaking task</b>",
    "",
    "🎬 <b>The scene</b>",
    escapeHtml(task.prompt),
    "",
    "💬 <b>Try these phrases</b>",
    phrases,
    "",
    "🚀 <b>Ready to answer the task?\nSend a 1–3 min voice message!</b>",
  ].join("\n");
}

export function buildSpeakingFeedbackMessage(
  transcript: string,
  evaluation: AnswerEvaluation,
): string {
  if (!evaluation.substantiveSpeech) {
    return NON_SUBSTANTIVE_SPEAKING_FEEDBACK;
  }
  const phrases = evaluation.requiredPhraseUsage
    .map((item) => `${item.status === "used_correctly" ? "✅" : "❌"} ${escapeHtml(item.phrase)}`)
    .join("\n");
  const hasCorrections =
    evaluation.corrections.length > 0 ||
    evaluation.grammarPriority !== null ||
    evaluation.requiredPhraseUsage.some((item) =>
      item.status === "used_incorrectly"
    );
  const missedPracticePhrases = evaluation.requiredPhraseUsage.some((item) =>
    item.status === "missed"
  );
  const feedbackHeading = hasCorrections
    ? "<b>Nice work 👏 A few things I’d fix:</b>"
    : missedPracticePhrases
    ? "<b>Nice work 👏 Your English sounded great! Next time, try to include more of your practice phrases. Here’s your answer:</b>"
    : "<b>You nailed it 👏 I wouldn’t change a thing! Here’s your answer:</b>";
  const lines = [
    feedbackHeading,
    `<blockquote expandable>${formatTranscript(transcript, evaluation)}</blockquote>`,
  ];
  lines.push("", `🎯 <b>Your practice phrases:</b>\n${phrases}`);
  if (evaluation.grammarPriority) {
    const grammar = evaluation.grammarPriority;
    lines.push(
      "",
      `🧩 <b>One grammar pattern to fix:</b>\n${escapeHtml(grammar.explanation)}\nExample: <i>${escapeHtml(cleanGrammarExample(grammar.example))}</i>`,
    );
  }
  lines.push(
    "",
    "🏁 That’s all for this task.\nReady for more? Send /speaking",
  );
  return lines.join("\n");
}

function cleanGrammarExample(value: string): string {
  return value.trim()
    .replace(/^(?:example\s*:\s*)?(?:correct\s*:\s*)?/i, "")
    .replace(/^(['"])([\s\S]*)\1$/, "$2")
    .trim();
}

function formatTranscript(
  transcript: string,
  evaluation: AnswerEvaluation,
): string {
  type Replacement = { start: number; end: number; html: string };
  const corrections: Array<Replacement & { overlapsPhrase: boolean }> = [];

  for (const correction of evaluation.corrections) {
    const start = findUnusedOccurrence(
      transcript,
      correction.original,
      corrections,
    );
    if (start === -1) continue;
    corrections.push({
      start,
      end: start + correction.original.length,
      html: formatInlineCorrection(correction.original, correction.corrected),
      overlapsPhrase: false,
    });
  }

  const phraseRanges: Array<{ start: number; end: number }> = [];
  for (const usage of evaluation.requiredPhraseUsage) {
    if (usage.status === "missed" || usage.matchedText === null) continue;
    const start = findUnusedOccurrence(
      transcript,
      usage.matchedText,
      phraseRanges,
    );
    if (start === -1) continue;
    phraseRanges.push({
      start,
      end: start + usage.matchedText.length,
    });
  }

  const replacements: Replacement[] = [];
  for (const correction of corrections) {
    correction.overlapsPhrase = phraseRanges.some((phrase) =>
      rangesOverlap(correction, phrase)
    );
    replacements.push({
      start: correction.start,
      end: correction.end,
      html: correction.overlapsPhrase
        ? `<u>${correction.html}</u>`
        : correction.html,
    });
  }

  for (const phrase of phraseRanges) {
    const overlappingCorrections = corrections
      .filter((correction) => rangesOverlap(correction, phrase))
      .sort((left, right) => left.start - right.start);
    let cursor = phrase.start;
    for (const correction of overlappingCorrections) {
      const segmentEnd = Math.min(correction.start, phrase.end);
      if (cursor < segmentEnd) {
        replacements.push(underlineRange(transcript, cursor, segmentEnd));
      }
      cursor = Math.max(cursor, Math.min(correction.end, phrase.end));
    }
    if (cursor < phrase.end) {
      replacements.push(underlineRange(transcript, cursor, phrase.end));
    }
  }

  replacements.sort((left, right) => left.start - right.start);
  let cursor = 0;
  let result = "";
  for (const replacement of replacements) {
    result += escapeHtml(transcript.slice(cursor, replacement.start));
    result += replacement.html;
    cursor = replacement.end;
  }
  return result + escapeHtml(transcript.slice(cursor));
}

function rangesOverlap(
  left: { start: number; end: number },
  right: { start: number; end: number },
): boolean {
  return left.start < right.end && left.end > right.start;
}

function underlineRange(
  transcript: string,
  start: number,
  end: number,
): { start: number; end: number; html: string } {
  return {
    start,
    end,
    html: `<u>${escapeHtml(transcript.slice(start, end))}</u>`,
  };
}

function findUnusedOccurrence(
  transcript: string,
  needle: string,
  replacements: Array<{ start: number; end: number }>,
): number {
  if (!needle.trim()) return -1;
  const haystack = transcript.toLocaleLowerCase("en");
  const normalizedNeedle = needle.toLocaleLowerCase("en");
  let start = haystack.indexOf(normalizedNeedle);
  while (start !== -1) {
    const end = start + needle.length;
    if (!replacements.some((item) => start < item.end && end > item.start)) {
      return start;
    }
    start = haystack.indexOf(normalizedNeedle, start + 1);
  }
  return -1;
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
