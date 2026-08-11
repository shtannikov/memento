import "server-only";

import type { AppId } from "@/lib/domain/app";
import {
  MAX_SPEAKING_TASKS_PER_DAY,
  SPEAKING_TASK_SIZE,
  selectLeastPracticed,
  type SpeakingTask,
  type SpeakingVocabularyItem,
  type TopicGenerationInput,
} from "../domain";
import { getLanguage } from "@/languages/registry";
import { AppError } from "@/lib/server/api";
import { generateSpeakingTopic } from "@/lib/server/openai";
import { getMementoDb } from "@/lib/server/supabase";
import { sendTelegramMessage } from "@/lib/server/telegram-bot";
import { buildSpeakingTaskMessage } from "./messages";
import { runWithTelegramTyping } from "./typing-indicator";

export type SpeakingCommandResult =
  | "created"
  | "resent"
  | { kind: "confirmation"; activeTaskId: string };

export type StoredTaskRow = {
  id: string;
  status: string;
  topic: string | null;
  domain: string | null;
  grammar_focus: string | null;
  prompt: string | null;
  created_at?: string;
};

export async function hasActiveSpeakingTask(
  userId: number,
  appId: AppId,
): Promise<boolean> {
  if (!getLanguage(appId).speaking) return false;
  const { data, error } = await getMementoDb()
    .from("speaking_tasks")
    .select("id")
    .eq("user_id", userId)
    .eq("app_id", appId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function runSpeakingTaskCommand(
  userId: number,
  appId: AppId,
  chatId: number,
): Promise<SpeakingCommandResult> {
  const resolution = await runWithTelegramTyping(
    chatId,
    appId,
    () => getOrCreateSpeakingTask(userId, appId),
  );
  if (resolution.kind === "confirmation") return resolution;
  const { task, existing } = resolution;
  await deliverSpeakingTask(task, chatId, appId);
  return existing ? "resent" : "created";
}

export async function regenerateSpeakingTaskCommand(
  userId: number,
  appId: AppId,
  chatId: number,
  activeTaskId: string,
): Promise<"created"> {
  const resolution = await runWithTelegramTyping(
    chatId,
    appId,
    () => getOrCreateSpeakingTask(userId, appId, activeTaskId),
  );
  if (resolution.kind === "confirmation") {
    throw new AppError(
      "REGENERATION_STALE",
      "This regeneration request is no longer active.",
      409,
    );
  }
  try {
    await deliverSpeakingTask(resolution.task, chatId, appId);
  } catch (error) {
    await getMementoDb()
      .from("speaking_tasks")
      .update({ status: "failed" })
      .eq("id", resolution.task.id);
    if (resolution.supersededTaskId) {
      await restoreSupersededTask(resolution.supersededTaskId);
    }
    throw error;
  }
  return "created";
}

export async function getOrCreateSpeakingTask(
  userId: number,
  appId: AppId,
  regenerationTaskId?: string,
): Promise<
  | { kind: "confirmation"; activeTaskId: string }
  | {
      kind: "task";
      task: SpeakingTask;
      existing: boolean;
      needsDelivery: boolean;
      supersededTaskId?: string;
    }
> {
  const speaking = getLanguage(appId).speaking;
  if (!speaking) {
    throw new AppError("SPEAKING_UNAVAILABLE", "Speaking practice is unavailable for this language.", 409);
  }
  const db = getMementoDb();
  const { data: existing, error: existingError } = await db
    .from("speaking_tasks")
    .select("id,status,topic,domain,grammar_focus,prompt,created_at")
    .eq("user_id", userId)
    .eq("app_id", appId)
    .in("status", ["preparing", "ready", "active"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) {
    if (existing.status === "preparing") {
      const createdAt = Date.parse(existing.created_at ?? "");
      if (
        Number.isFinite(createdAt) &&
        createdAt < Date.now() - 10 * 60 * 1000
      ) {
        const { error: staleError } = await db
          .from("speaking_tasks")
          .update({ status: "failed" })
          .eq("id", existing.id)
          .eq("status", "preparing");
        if (staleError) throw staleError;
        return getOrCreateSpeakingTask(userId, appId);
      }
      throw new AppError(
        "TASK_PREPARING",
        "Your speaking task is being prepared. Please try again in a moment.",
        409,
      );
    }
    if (existing.status === "ready") {
      if (regenerationTaskId) {
        throw new AppError(
          "REGENERATION_STALE",
          "This regeneration request is no longer active.",
          409,
        );
      }
      return {
        kind: "task",
        task: await loadSpeakingTask(existing as StoredTaskRow),
        existing: true,
        needsDelivery: true,
      };
    }
  }

  const today = formatUtcDate(new Date());
  const { count, error: countError } = await db
    .from("speaking_tasks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("app_id", appId)
    .eq("task_date", today);
  if (countError) throw countError;
  if ((count ?? 0) >= MAX_SPEAKING_TASKS_PER_DAY) {
    throw new AppError(
      "DAILY_SPEAKING_LIMIT",
      `You have reached the daily limit of ${MAX_SPEAKING_TASKS_PER_DAY} tasks. Please come back tomorrow.`,
      429,
    );
  }

  if (existing?.status === "active" && !regenerationTaskId) {
    return {
      kind: "confirmation",
      activeTaskId: String(existing.id),
    };
  }
  if (
    regenerationTaskId &&
    (existing?.status !== "active" || String(existing.id) !== regenerationTaskId)
  ) {
    throw new AppError(
      "REGENERATION_STALE",
      "This regeneration request is no longer active.",
      409,
    );
  }
  let previousTask: TopicGenerationInput["previousTask"];
  if (regenerationTaskId && existing) {
    if (
      !existing.topic ||
      !existing.prompt ||
      !existing.domain ||
      !existing.grammar_focus
    ) {
      throw new Error("Active speaking task is incomplete");
    }
    previousTask = {
      title: existing.topic,
      speakingPrompt: existing.prompt,
      domain: existing.domain,
      grammarFocus: existing.grammar_focus,
    };
  }

  const items = await selectPracticingItems(userId, appId);
  if (items.length === 0) {
    throw new AppError(
      "NO_PRACTICING_ITEMS",
      "🎙 Nothing in Practicing yet. Keep reviewing your Learning phrases in quizzes, or tap Done in the App to move one to Practicing.",
      409,
    );
  }

  const supersededTaskId = existing?.status === "active"
    ? String(existing.id)
    : undefined;
  if (supersededTaskId) {
    const { data: superseded, error: supersedeError } = await db
      .from("speaking_tasks")
      .update({ status: "superseded" })
      .eq("id", supersededTaskId)
      .eq("status", "active")
      .select("id")
      .maybeSingle();
    if (supersedeError) throw supersedeError;
    if (!superseded) {
      throw new AppError(
        "REGENERATION_STALE",
        "This regeneration request is no longer active.",
        409,
      );
    }
  }

  const { data: created, error: createError } = await db
    .from("speaking_tasks")
    .insert({ user_id: userId, app_id: appId, task_date: today, status: "preparing" })
    .select("id")
    .single();
  if (createError) {
    if (supersededTaskId) await restoreSupersededTask(supersededTaskId);
    if (createError.code === "23505") {
      if (regenerationTaskId) {
        throw new AppError(
          "TASK_PREPARING",
          "Your speaking task is being prepared. Please try again in a moment.",
          409,
        );
      }
      return getOrCreateSpeakingTask(userId, appId);
    }
    throw createError;
  }
  const taskId = String(created.id);

  try {
    const { error: itemError } = await db.from("speaking_task_items").insert(
      items.map((item, position) => ({
        task_id: taskId,
        vocabulary_id: Number(item.vocabularyId),
        position,
        term_snapshot: item.term,
        definition_snapshot: item.definition,
      })),
    );
    if (itemError) throw itemError;

    const context = await loadTopicContext(userId, appId);
    const domainOptions = previousTask
      ? speaking.lifeDomains.filter(
          (domain) =>
            domain.toLowerCase() !== previousTask.domain.trim().toLowerCase(),
        )
      : speaking.lifeDomains;
    const grammarOptions = previousTask
      ? speaking.grammarFocuses.filter(
          (focus) =>
            focus.toLowerCase() !==
            previousTask.grammarFocus.trim().toLowerCase(),
        )
      : speaking.grammarFocuses;
    const targetDomain = selectLeastPracticed(
      domainOptions,
      context.recentTopics.map((row) => row.domain),
      `${userId}:${today}:domain`,
    );
    const targetGrammarFocus = selectLeastPracticed(
      grammarOptions,
      context.recentTopics.map((row) => row.grammarFocus),
      `${userId}:${today}:grammar`,
    );
    const generated = await generateSpeakingTopic({
      targetDomain,
      targetGrammarFocus,
      ...(previousTask ? { previousTask } : {}),
      recentTopics: context.recentTopics,
      recentLearnerExcerpts: context.recentLearnerExcerpts,
      requiredPhrases: items.map((item) => item.term),
    }, userId, appId);
    const { error: readyError } = await db
      .from("speaking_tasks")
      .update({
        status: "ready",
        topic: generated.title,
        domain: generated.domain,
        grammar_focus: generated.grammarFocus,
        prompt: generated.speakingPrompt,
        ready_at: new Date().toISOString(),
      })
      .eq("id", taskId)
      .eq("status", "preparing");
    if (readyError) throw readyError;
    return {
      kind: "task",
      existing: false,
      needsDelivery: true,
      ...(supersededTaskId ? { supersededTaskId } : {}),
      task: {
        id: taskId,
        topic: generated.title,
        domain: generated.domain,
        grammarFocus: generated.grammarFocus,
        prompt: generated.speakingPrompt,
        items,
      },
    };
  } catch (error) {
    await db.from("speaking_tasks").update({ status: "failed" }).eq("id", taskId);
    if (supersededTaskId) await restoreSupersededTask(supersededTaskId);
    throw error;
  }
}

async function restoreSupersededTask(taskId: string): Promise<void> {
  await getMementoDb()
    .from("speaking_tasks")
    .update({ status: "active" })
    .eq("id", taskId)
    .eq("status", "superseded");
}

export async function deliverSpeakingTask(
  task: SpeakingTask,
  chatId: number,
  appId: AppId,
): Promise<void> {
  const sent = await sendTelegramMessage(
    chatId,
    buildSpeakingTaskMessage(task),
    undefined,
    "HTML",
    appId,
  );
  const db = getMementoDb();
  const { error: messageError } = await db.from("speaking_task_messages").insert({
    task_id: task.id,
    chat_id: chatId,
    message_id: sent.messageId,
  });
  if (messageError) throw messageError;
  const { error: activeError } = await db.from("speaking_tasks").update({
    status: "active",
    activated_at: new Date().toISOString(),
  }).eq("id", task.id).in("status", ["ready", "active"]);
  if (activeError) throw activeError;
}

async function selectPracticingItems(
  userId: number,
  appId: AppId,
): Promise<SpeakingVocabularyItem[]> {
  const db = getMementoDb();
  const { data: vocabulary, error } = await db.from("vocabulary_items")
    .select("id,term,definition")
    .eq("user_id", userId).eq("app_id", appId)
    .eq("status", "practicing").eq("is_removed", false);
  if (error) throw error;
  if (!vocabulary?.length) return [];
  const { data: states, error: stateError } = await db.from("speaking_states")
    .select("vocabulary_id,practice_rank")
    .in("vocabulary_id", vocabulary.map((item) => item.id));
  if (stateError) throw stateError;
  const ranks = new Map((states ?? []).map((row) => [String(row.vocabulary_id), Number(row.practice_rank)]));
  return vocabulary
    .sort((left, right) => (ranks.get(String(left.id)) ?? Number.MAX_SAFE_INTEGER) - (ranks.get(String(right.id)) ?? Number.MAX_SAFE_INTEGER))
    .slice(0, SPEAKING_TASK_SIZE)
    .map((item) => ({
      vocabularyId: String(item.id),
      term: item.term,
      definition: item.definition,
    }));
}

export async function loadSpeakingTask(row: StoredTaskRow): Promise<SpeakingTask> {
  if (!row.topic || !row.domain || !row.grammar_focus || !row.prompt) {
    throw new Error("Stored speaking task is incomplete");
  }
  const { data, error } = await getMementoDb().from("speaking_task_items")
    .select("vocabulary_id,term_snapshot,definition_snapshot")
    .eq("task_id", row.id).order("position");
  if (error) throw error;
  return {
    id: row.id,
    topic: row.topic,
    domain: row.domain,
    grammarFocus: row.grammar_focus,
    prompt: row.prompt,
    items: (data ?? []).map((item) => ({
      vocabularyId: String(item.vocabulary_id),
      term: item.term_snapshot,
      definition: item.definition_snapshot,
    })),
  };
}

async function loadTopicContext(userId: number, appId: AppId) {
  const db = getMementoDb();
  const { data: tasks, error: taskError } = await db.from("speaking_tasks")
    .select("id,topic,domain,grammar_focus")
    .eq("user_id", userId).eq("app_id", appId)
    .eq("status", "completed")
    .order("created_at", { ascending: false }).limit(60);
  if (taskError) throw taskError;
  const ids = (tasks ?? []).map((task) => task.id);
  let recentLearnerExcerpts: string[] = [];
  if (ids.length > 0) {
    const { data: lessons, error: lessonError } = await db.from("speaking_lessons")
      .select("transcript,task_id")
      .in("task_id", ids).not("transcript", "is", null)
      .order("created_at", { ascending: false }).limit(3);
    if (lessonError) throw lessonError;
    recentLearnerExcerpts = (lessons ?? [])
      .map((lesson) => String(lesson.transcript ?? "").trim().slice(0, 600))
      .filter(Boolean);
  }
  return {
    recentTopics: (tasks ?? []).map((task) => ({
      topic: task.topic ?? "",
      domain: task.domain,
      grammarFocus: task.grammar_focus,
    })),
    recentLearnerExcerpts,
  };
}

function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
