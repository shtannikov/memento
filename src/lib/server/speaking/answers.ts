import "server-only";

import type { AppId } from "@/lib/domain/app";
import {
  MAX_VOICE_DURATION_SECONDS,
  MIN_VOICE_DURATION_SECONDS,
} from "@/lib/domain/speaking";
import { AppError } from "../api";
import { evaluateSpeakingAnswer, transcribeVoice } from "../openai";
import { getMementoDb } from "../supabase";
import {
  downloadTelegramFile,
  getTelegramFile,
  sendTelegramMessage,
} from "../telegram-bot";
import { buildSpeakingFeedbackMessage } from "./messages";
import { loadSpeakingTask, type StoredTaskRow } from "./tasks";
import { runWithTelegramTyping } from "./typing-indicator";

export type SpeakingVoiceInput = {
  chatId: number;
  userId: number;
  messageId: number;
  replyToMessageId?: number;
  fileId: string;
  durationSeconds: number;
};

export async function processSpeakingVoiceAnswer(
  input: SpeakingVoiceInput,
  appId: AppId,
): Promise<"completed" | "duplicate"> {
  validateVoiceDuration(input.durationSeconds);
  const db = getMementoDb();
  const { data: duplicate, error: duplicateError } = await db
    .from("speaking_lessons")
    .select("id")
    .eq("chat_id", input.chatId)
    .eq("message_id", input.messageId)
    .maybeSingle();
  if (duplicateError) throw duplicateError;
  if (duplicate) return "duplicate";

  const taskRow = await resolveAnswerTask(input, appId);
  const task = await loadSpeakingTask(taskRow);
  const result = await runWithTelegramTyping(input.chatId, appId, async () => {
    const { filePath } = await getTelegramFile(input.fileId, appId);
    const bytes = await downloadTelegramFile(filePath, appId);
    const transcript = await transcribeVoice({
      bytes,
      filename: filePath,
      mimeType: "audio/ogg",
    }, appId);
    const evaluation = await evaluateSpeakingAnswer(
      transcript,
      task,
      input.userId,
      appId,
    );
    const feedbackHtml = buildSpeakingFeedbackMessage(
      transcript,
      evaluation,
    );
    const { data: completion, error: completionError } = await db.rpc(
      "complete_speaking_task",
      {
        requested_task_id: task.id,
        requested_user_id: input.userId,
        requested_app_id: appId,
        incoming_chat_id: input.chatId,
        incoming_message_id: input.messageId,
        requested_transcript: transcript,
        requested_evaluation: evaluation,
        requested_feedback_html: feedbackHtml,
      },
    );
    if (completionError) throw completionError;
    if ((completion as { alreadyCompleted?: boolean } | null)?.alreadyCompleted) {
      return { status: "duplicate" as const, feedbackHtml: null };
    }
    return { status: "completed" as const, feedbackHtml };
  });
  if (result.feedbackHtml) {
    await sendTelegramMessage(
      input.chatId,
      result.feedbackHtml,
      input.messageId,
      "HTML",
      appId,
    );
  }
  return result.status;
}

export function validateVoiceDuration(durationSeconds: number): void {
  if (durationSeconds < MIN_VOICE_DURATION_SECONDS) {
    throw new AppError(
      "VOICE_TOO_SHORT",
      `That voice note is too short. Please speak for at least ${MIN_VOICE_DURATION_SECONDS} seconds.`,
      409,
    );
  }
  if (durationSeconds > MAX_VOICE_DURATION_SECONDS) {
    throw new AppError(
      "VOICE_TOO_LONG",
      `That voice note is too long. Keep it under ${MAX_VOICE_DURATION_SECONDS / 60} minutes.`,
      409,
    );
  }
}

async function resolveAnswerTask(
  input: SpeakingVoiceInput,
  appId: AppId,
): Promise<StoredTaskRow> {
  const db = getMementoDb();
  let taskId: string | null = null;
  if (input.replyToMessageId) {
    const { data: mapping, error: mappingError } = await db
      .from("speaking_task_messages")
      .select("task_id")
      .eq("chat_id", input.chatId)
      .eq("message_id", input.replyToMessageId)
      .maybeSingle();
    if (mappingError) throw mappingError;
    if (!mapping) {
      throw new AppError(
        "TASK_STALE",
        "That speaking task is no longer active. If you have another active task, reply to it. Otherwise, send /speaking to get a new one.",
        409,
      );
    }
    taskId = String(mapping.task_id);
  }

  let query = db
    .from("speaking_tasks")
    .select("id,status,topic,domain,grammar_focus,prompt,created_at")
    .eq("user_id", input.userId)
    .eq("app_id", appId)
    .eq("status", "active");
  query = taskId
    ? query.eq("id", taskId)
    : query.order("created_at", { ascending: false }).limit(1);
  const { data: task, error: taskError } = await query.maybeSingle();
  if (taskError) throw taskError;
  if (!task) {
    throw new AppError(
      "NO_ACTIVE_TASK",
      taskId
        ? "That speaking task is no longer active. If you have another active task, reply to it. Otherwise, send /speaking to get a new one."
        : "You don’t have an active speaking task. Send /speaking to get one.",
      409,
    );
  }
  return task as StoredTaskRow;
}
