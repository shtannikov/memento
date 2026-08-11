import type { TelegramUser } from "@/app/_server/telegram/auth";
import { DEFAULT_APP_ID, type AppId } from "@/app/app-config";
import { getMementoDb } from "@/app/_server/supabase";
import {
  VOCABULARY_MAX_ITEMS,
  type VocabularyInput,
} from "@/app/_features/vocabulary/domain/vocabulary";
import { AppError } from "@/app/_server/api";
import { getLanguage } from "@/app/_languages/registry";

export type StoredVocabularyItem = {
  id: string;
  term: string;
  definition: string;
  status: "learning" | "practicing" | "learned";
  consecutiveCorrect?: number;
  correctUses?: number;
  practiceRank?: number;
};

export async function ensureUserAndSeed(
  user: TelegramUser,
  appId: AppId = DEFAULT_APP_ID,
): Promise<void> {
  const supabase = getMementoDb();
  const { error: userError } = await supabase
    .from("app_users")
    .upsert(
      {
        telegram_user_id: user.id,
        username: user.username ?? null,
        first_name: user.first_name ?? null,
        last_name: user.last_name ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "telegram_user_id" },
    )
    .select("telegram_user_id")
    .single();
  if (userError) throw userError;

  const { data: userApp, error: userAppError } = await supabase
    .from("user_apps")
    .upsert(
      { user_id: user.id, app_id: appId, updated_at: new Date().toISOString() },
      { onConflict: "user_id,app_id" },
    )
    .select("starter_seeded_at")
    .single();
  if (userAppError) throw userAppError;
  if (userApp.starter_seeded_at) return;

  const starterVocabulary = getLanguage(appId).starterVocabulary;

  const { error: seedError } = await supabase
    .from("vocabulary_items")
    .upsert(
      starterVocabulary.map((item) => ({
        user_id: user.id,
        app_id: appId,
        term: item.term,
        definition: item.definition,
        status: "learning",
        is_removed: false,
      })),
      { onConflict: "user_id,app_id,normalized_term", ignoreDuplicates: true },
    )
    .select("id");
  if (seedError) throw seedError;

  const { data: starterRows, error: starterError } = await supabase
    .from("vocabulary_items")
    .select("id")
    .eq("user_id", user.id)
    .eq("app_id", appId)
    .in(
      "normalized_term",
      starterVocabulary.map((item) => item.term.toLocaleLowerCase()),
    );
  if (starterError) throw starterError;
  const { error: scheduleError } = await supabase
    .from("scheduling_states")
    .upsert(
      (starterRows ?? []).map(({ id }) => ({ vocabulary_id: id })),
      { onConflict: "vocabulary_id", ignoreDuplicates: true },
    );
  if (scheduleError) throw scheduleError;

  const { error: markError } = await supabase
    .from("user_apps")
    .update({ starter_seeded_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("app_id", appId)
    .is("starter_seeded_at", null);
  if (markError) throw markError;
}

export async function loadVocabulary(
  userId: number,
  appId: AppId = DEFAULT_APP_ID,
): Promise<{
  learning: StoredVocabularyItem[];
  practicing: StoredVocabularyItem[];
  learned: StoredVocabularyItem[];
}> {
  const { data, error } = await getMementoDb()
    .from("vocabulary_items")
    .select("id, term, definition, status")
    .eq("user_id", userId)
    .eq("app_id", appId)
    .eq("is_removed", false)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const itemIds = (data ?? []).map((item) => item.id);
  const [speakingResult, schedulingResult] = itemIds.length
    ? await Promise.all([
        getMementoDb()
          .from("speaking_states")
          .select("vocabulary_id,correct_uses,practice_rank")
          .in("vocabulary_id", itemIds),
        getMementoDb()
          .from("scheduling_states")
          .select("vocabulary_id,consecutive_correct")
          .in("vocabulary_id", itemIds),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
      ];
  const { data: speakingStates, error: speakingError } = speakingResult;
  const { data: schedulingStates, error: schedulingError } = schedulingResult;
  if (speakingError) throw speakingError;
  if (schedulingError) throw schedulingError;
  const speakingProgress = new Map(
    (speakingStates ?? []).map((state) => [
      String(state.vocabulary_id),
      {
        correctUses: Number(state.correct_uses),
        practiceRank: Number(state.practice_rank),
      },
    ]),
  );
  const learningProgress = new Map(
    (schedulingStates ?? []).map((state) => [
      String(state.vocabulary_id),
      Number(state.consecutive_correct),
    ]),
  );
  const items = (data ?? []).map((item) => ({
    id: String(item.id),
    term: item.term,
    definition: item.definition,
    status: item.status as "learning" | "practicing" | "learned",
    ...(item.status === "learning"
      ? {
          consecutiveCorrect:
            learningProgress.get(String(item.id)) ?? 0,
        }
      : {}),
    ...(item.status === "practicing"
      ? {
          correctUses:
            speakingProgress.get(String(item.id))?.correctUses ?? 0,
          practiceRank:
            speakingProgress.get(String(item.id))?.practiceRank ??
            Number.MAX_SAFE_INTEGER,
        }
      : {}),
  }));
  return {
    learning: items.filter((item) => item.status === "learning"),
    practicing: items
      .filter((item) => item.status === "practicing")
      .sort(
        (left, right) =>
          (left.practiceRank ?? Number.MAX_SAFE_INTEGER) -
          (right.practiceRank ?? Number.MAX_SAFE_INTEGER),
      ),
    learned: items.filter((item) => item.status === "learned"),
  };
}

export async function reorderPracticingVocabulary(
  userId: number,
  appId: AppId,
  vocabularyIds: string[],
): Promise<void> {
  const { error } = await getMementoDb().rpc(
    "reorder_practicing_vocabulary",
    {
      requested_user_id: userId,
      requested_app_id: appId,
      requested_vocabulary_ids: vocabularyIds.map(Number),
    },
  );
  if (error) throw error;
}

export async function importVocabularyItems(
  user: TelegramUser,
  items: VocabularyInput[],
  appId: AppId = DEFAULT_APP_ID,
): Promise<number> {
  await ensureUserAndSeed(user, appId);
  const { error } = await getMementoDb().rpc("import_vocabulary_items", {
    requested_user_id: user.id,
    requested_app_id: appId,
    requested_items: items,
  });
  if (error) {
    if (error.message.includes("VOCABULARY_LIMIT_EXCEEDED")) {
      throw new AppError(
        "VOCABULARY_LIMIT_EXCEEDED",
        `Your vocabulary can contain up to ${VOCABULARY_MAX_ITEMS} phrases.`,
        409,
      );
    }
    throw error;
  }
  return items.length;
}

export async function prepareLearningReset(
  user: TelegramUser,
  appId: AppId = DEFAULT_APP_ID,
): Promise<{ learningCount: number }> {
  await ensureUserAndSeed(user, appId);
  const { data, error } = await getMementoDb().rpc("prepare_learning_reset", {
    requested_user_id: user.id,
    requested_app_id: appId,
  });
  if (error) throw error;
  return data as { learningCount: number };
}

export async function confirmLearningReset(
  user: TelegramUser,
  appId: AppId = DEFAULT_APP_ID,
): Promise<{ learningCount: number }> {
  await ensureUserAndSeed(user, appId);
  const { data, error } = await getMementoDb().rpc("confirm_learning_reset", {
    requested_user_id: user.id,
    requested_app_id: appId,
  });
  if (error) {
    if (error.message.includes("RESET_CONFIRMATION_EXPIRED")) {
      throw new AppError(
        "RESET_CONFIRMATION_EXPIRED",
        "That reset confirmation has expired. Send /reset to start again.",
        409,
      );
    }
    throw error;
  }
  return data as { learningCount: number };
}

export async function resetSchedule(vocabularyId: string): Promise<void> {
  const { error } = await getMementoDb()
    .from("scheduling_states")
    .upsert({
      vocabulary_id: vocabularyId,
      repetitions: 0,
      consecutive_correct: 0,
      interval_days: 0,
      ease_factor: 2.5,
      next_review_at: null,
      last_reviewed_at: null,
      updated_at: new Date().toISOString(),
    });
  if (error) throw error;
}
