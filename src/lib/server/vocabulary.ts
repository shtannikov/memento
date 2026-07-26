import type { TelegramUser } from "./telegram-auth";
import { getMementoDb } from "./supabase";
import { STARTER_VOCABULARY } from "@/lib/domain/starter-vocabulary";

export type StoredVocabularyItem = {
  id: string;
  term: string;
  definition: string;
  status: "learning" | "learned";
};

export async function ensureUserAndSeed(user: TelegramUser): Promise<void> {
  const supabase = getMementoDb();
  const { data: appUser, error: userError } = await supabase
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
    .select("starter_seeded_at")
    .single();
  if (userError) throw userError;
  if (appUser.starter_seeded_at) return;

  const { error: seedError } = await supabase
    .from("vocabulary_items")
    .upsert(
      STARTER_VOCABULARY.map((item) => ({
        user_id: user.id,
        term: item.term,
        definition: item.definition,
        status: "learning",
        is_removed: false,
      })),
      { onConflict: "user_id,normalized_term", ignoreDuplicates: true },
    )
    .select("id");
  if (seedError) throw seedError;

  const { data: starterRows, error: starterError } = await supabase
    .from("vocabulary_items")
    .select("id")
    .eq("user_id", user.id)
    .in(
      "normalized_term",
      STARTER_VOCABULARY.map((item) => item.term.toLowerCase()),
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
    .from("app_users")
    .update({ starter_seeded_at: new Date().toISOString() })
    .eq("telegram_user_id", user.id)
    .is("starter_seeded_at", null);
  if (markError) throw markError;
}

export async function loadVocabulary(
  userId: number,
): Promise<{ learning: StoredVocabularyItem[]; learned: StoredVocabularyItem[] }> {
  const { data, error } = await getMementoDb()
    .from("vocabulary_items")
    .select("id, term, definition, status")
    .eq("user_id", userId)
    .eq("is_removed", false)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const items = (data ?? []).map((item) => ({
    id: String(item.id),
    term: item.term,
    definition: item.definition,
    status: item.status as "learning" | "learned",
  }));
  return {
    learning: items.filter((item) => item.status === "learning"),
    learned: items.filter((item) => item.status === "learned"),
  };
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
