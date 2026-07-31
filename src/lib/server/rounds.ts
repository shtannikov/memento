import { DAILY_GENERATION_LIMIT, ROUND_SIZE } from "@/lib/domain/round";
import type { AppId } from "@/lib/domain/app";
import { randomizeQuizOptions } from "@/lib/domain/quiz-options";
import { AppError } from "./api";
import {
  generateQuizCards,
  getOpenAIClient,
  type GenerationVocabularyItem,
} from "./openai";
import { loadRecentQuizSentences } from "./quiz-history";
import { getMementoDb } from "./supabase";

export type ClientQuizCard = {
  id: string;
  vocabularyId: string;
  sentence: string;
  answer: string;
  options: string[];
};

export type PreparedRound = {
  id: string;
  cards: ClientQuizCard[];
  attemptsRemaining: number;
};

export async function createRound(
  userId: number,
  appId: AppId,
  retryRoundId?: string,
): Promise<PreparedRound> {
  const supabase = getMementoDb();
  await supabase
    .from("rounds")
    .update({ status: "cancelled", completed_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("app_id", appId)
    .in("status", ["preparing", "active"]);

  const items = retryRoundId
    ? await loadRetryItems(userId, appId, retryRoundId)
    : await selectRoundItems(userId, appId);
  if (items.length === 0) {
    throw new AppError(
      "NO_LEARNING_ITEMS",
      "Add a word to Learning before starting a quiz.",
      409,
    );
  }
  const recentSentences = await loadRecentQuizSentences(userId, items, appId);

  const { data: createdRound, error: createError } = await supabase
    .from("rounds")
    .insert({
      user_id: userId,
      app_id: appId,
      status: "preparing",
      selected_vocabulary_ids: items.map((item) => item.id),
      total_items: items.length,
    })
    .select("id")
    .single();
  if (createError) throw createError;

  // Fail before reserving quota if the server has no usable OpenAI client.
  const openai = getOpenAIClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data: reserved, error: quotaError } = await supabase.rpc(
    "reserve_generation_attempt",
    { requested_user_id: userId, requested_app_id: appId, requested_date: today },
  );
  if (quotaError) throw quotaError;
  if (!reserved) {
    await markRound(createdRound.id, userId, appId, "failed");
    throw new AppError(
      "DAILY_GENERATION_LIMIT",
      "You’ve used today’s five quiz generations.\nTry again tomorrow.",
      429,
    );
  }

  try {
    const generatedCards = await generateQuizCards(
      items,
      userId,
      openai,
      recentSentences,
      appId,
    );
    const cards = randomizeQuizOptions(generatedCards);
    const { error: cardError } = await supabase.from("round_cards").insert(
      cards.map((card, position) => ({
        round_id: createdRound.id,
        vocabulary_id: card.vocabularyId,
        position,
        sentence: card.sentence,
        answer: card.answer,
        options: card.options,
      })),
    );
    if (cardError) throw cardError;

    const { error: activateError } = await supabase
      .from("rounds")
      .update({
        status: "active",
        activated_at: new Date().toISOString(),
      })
      .eq("id", createdRound.id)
      .eq("user_id", userId)
      .eq("app_id", appId)
      .eq("status", "preparing");
    if (activateError) throw activateError;

    const attempts = await generationAttempts(userId, appId, today);
    return {
      id: createdRound.id,
      attemptsRemaining: Math.max(0, DAILY_GENERATION_LIMIT - attempts),
      cards: cards.map((card) => ({ ...card, id: card.vocabularyId })),
    };
  } catch (error) {
    await markRound(createdRound.id, userId, appId, "failed");
    if (error instanceof AppError) throw error;
    throw new AppError(
      "GENERATION_FAILED",
      "Couldn’t prepare this quiz. Please try again.",
      502,
      { retryRoundId: createdRound.id },
    );
  }
}

async function selectRoundItems(
  userId: number,
  appId: AppId,
): Promise<GenerationVocabularyItem[]> {
  const supabase = getMementoDb();
  const { data: vocabulary, error } = await supabase
    .from("vocabulary_items")
    .select("id, term, definition")
    .eq("user_id", userId)
    .eq("app_id", appId)
    .eq("status", "learning")
    .eq("is_removed", false);
  if (error) throw error;
  if (!vocabulary?.length) return [];

  const ids = vocabulary.map((item) => item.id);
  const { data: states, error: stateError } = await supabase
    .from("scheduling_states")
    .select("vocabulary_id, repetitions, next_review_at")
    .in("vocabulary_id", ids);
  if (stateError) throw stateError;
  const byId = new Map(
    (states ?? []).map((state) => [String(state.vocabulary_id), state]),
  );
  const now = Date.now();

  return vocabulary
    .map((item) => {
      const state = byId.get(String(item.id));
      const due =
        state?.next_review_at &&
        new Date(state.next_review_at).getTime() <= now;
      const priority = due ? 0 : !state || state.repetitions === 0 ? 1 : 2;
      return {
        id: String(item.id),
        term: item.term,
        definition: item.definition,
        priority,
        dueAt: state?.next_review_at ?? "",
      };
    })
    .sort(
      (left, right) =>
        left.priority - right.priority ||
        left.dueAt.localeCompare(right.dueAt) ||
        left.id.localeCompare(right.id),
    )
    .slice(0, ROUND_SIZE)
    .map(({ id, term, definition }) => ({ id, term, definition }));
}

async function loadRetryItems(
  userId: number,
  appId: AppId,
  retryRoundId: string,
): Promise<GenerationVocabularyItem[]> {
  const supabase = getMementoDb();
  const { data: round, error } = await supabase
    .from("rounds")
    .select("selected_vocabulary_ids, status")
    .eq("id", retryRoundId)
    .eq("user_id", userId)
    .eq("app_id", appId)
    .single();
  if (error || !round || !["failed", "cancelled"].includes(round.status)) {
    throw new AppError("ROUND_STALE", "This quiz can no longer be retried.", 409);
  }

  const { data: vocabulary, error: vocabularyError } = await supabase
    .from("vocabulary_items")
    .select("id, term, definition")
    .eq("user_id", userId)
    .eq("app_id", appId)
    .eq("status", "learning")
    .eq("is_removed", false)
    .in("id", round.selected_vocabulary_ids);
  if (
    vocabularyError ||
    !vocabulary ||
    vocabulary.length !== round.selected_vocabulary_ids.length
  ) {
    throw new AppError("ROUND_STALE", "Your vocabulary changed. Start a new quiz.", 409);
  }
  const byId = new Map(vocabulary.map((item) => [String(item.id), item]));
  return round.selected_vocabulary_ids.map((id: number) => {
    const item = byId.get(String(id));
    if (!item) throw new AppError("ROUND_STALE", "Your vocabulary changed. Start a new quiz.", 409);
    return { id: String(item.id), term: item.term, definition: item.definition };
  });
}

async function markRound(
  roundId: string,
  userId: number,
  appId: AppId,
  status: "failed" | "cancelled",
): Promise<void> {
  await getMementoDb()
    .from("rounds")
    .update({ status, completed_at: new Date().toISOString() })
    .eq("id", roundId)
    .eq("user_id", userId)
    .eq("app_id", appId)
    .in("status", ["preparing", "active"]);
}

async function generationAttempts(
  userId: number,
  appId: AppId,
  date: string,
): Promise<number> {
  const { data } = await getMementoDb()
    .from("generation_usage")
    .select("attempts")
    .eq("user_id", userId)
    .eq("app_id", appId)
    .eq("usage_date", date)
    .maybeSingle();
  return data?.attempts ?? 0;
}
