import type {
  AnswerEvaluation,
  SpeakingTask,
} from "@/lib/domain/speaking";
import { estimateCefrLevel } from "@/lib/domain/speaking";

export function buildSpeakingTaskMessage(task: SpeakingTask): string {
  const phrases = task.items
    .map((item) => `• <i>${escapeHtml(item.term)}</i>`)
    .join("\n");
  return [
    "🎯 <b>Your next speaking task</b>",
    "",
    `✨ <b>${escapeHtml(task.topic)}</b>`,
    "",
    "🎬 <b>The scene</b>",
    escapeHtml(task.prompt),
    "",
    "🪄 <b>Your language twist</b>",
    escapeHtml(formatGrammarTwist(task.grammarFocus)),
    "",
    "💬 <b>Try these phrases</b>",
    phrases,
    "",
    "🚀 <b>Hit reply and send a 30-second–3-minute voice note.</b>",
  ].join("\n");
}

export function buildSpeakingFeedbackMessage(
  transcript: string,
  evaluation: AnswerEvaluation,
  speechStats: Record<string, number>,
): string {
  const corrections = evaluation.corrections
    .map((item) => `• <s>${escapeHtml(item.original)}</s> → <b>${escapeHtml(item.corrected)}</b>\n  ${escapeHtml(item.why)}`)
    .join("\n");
  const phrases = evaluation.requiredPhraseUsage
    .map((item) => `${item.status === "used_correctly" ? "✅" : "❌"} ${escapeHtml(item.phrase)}`)
    .join("\n");
  const lines = [
    "<b>Nice work 👏 A few things I’d fix:</b>",
    `<blockquote expandable>${escapeHtml(transcript)}</blockquote>`,
  ];
  if (corrections) lines.push("", `✍️ <b>Corrections</b>\n${corrections}`);
  lines.push("", `🎯 <b>Your practice phrases:</b>\n${phrases}`);
  if (evaluation.grammarPriority) {
    const grammar = evaluation.grammarPriority;
    lines.push(
      "",
      `🧩 <b>One grammar pattern to fix:</b>\n<b>${escapeHtml(grammar.issue)}</b>\n${escapeHtml(grammar.rule)}\nExample: <i>${escapeHtml(cleanGrammarExample(grammar.example))}</i>`,
    );
  }
  lines.push(
    "",
    "📊 <b>Quick stats:</b>",
    `🗣 Speaking pace: ${speechStats.wpm ?? 0} words/min`,
    `🌍 Estimated level: ${estimateCefrLevel(evaluation.rubric)}`,
    "",
    "🌟 I’m looking forward to hearing your next answer.",
  );
  return lines.join("\n");
}

export function formatGrammarTwist(grammarFocus: string): string {
  const twists: Record<string, string> = {
    "past narration with tense contrast": "Bring the story to life by moving between past events.",
    "future plans and predictions": "Look ahead: mix your plans with what you think will happen.",
    "first conditional for realistic consequences": "Follow the domino effect: if this happens, what comes next?",
    "second conditional for hypothetical situations": "Let reality take a break — imagine what you would do.",
    "third conditional and wish for past regrets": "Rewrite the past: what could have gone differently?",
    "question formation in an interactive role-play": "Lead the conversation with your own questions.",
    "modals for advice, obligation, and possibility": "Balance friendly advice, real must-dos, and possible options.",
    "comparisons and language of preference": "Compare the options and make your personal choice clear.",
    "present perfect for experiences and change": "Connect your past experience with who you are now.",
    "reported speech for retelling conversations": "Bring someone else’s words into your version of the story.",
    "relative clauses for detailed descriptions": "Add details that make people, places, and things easy to picture.",
    "polite requests and indirect questions": "Keep it smooth and polite while asking for what you need.",
  };
  return twists[grammarFocus] ?? "Stretch your English and try a few different sentence patterns.";
}

function cleanGrammarExample(value: string): string {
  return value.trim()
    .replace(/^(?:example\s*:\s*)?(?:correct\s*:\s*)?/i, "")
    .replace(/^(['"])([\s\S]*)\1$/, "$2")
    .trim();
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
