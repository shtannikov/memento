import "server-only";

import { DEFAULT_APP_ID, type AppId } from "@/lib/domain/app";

import type {
  GenerationVocabularyItem,
  RecentQuizSentence,
} from "@/server/openai";
import { normalizeQuizSentence } from "@/server/openai";
import { getMementoDb } from "@/server/supabase";

const RECENT_ROUND_LIMIT = 10;
const RECENT_SENTENCE_LIMIT_PER_ITEM = 3;

type StoredQuizSentence = {
  vocabulary_id: number | string;
  sentence: string;
};

export async function loadRecentQuizSentences(
  userId: number,
  items: GenerationVocabularyItem[],
  appId: AppId = DEFAULT_APP_ID,
): Promise<RecentQuizSentence[]> {
  if (items.length === 0) return [];

  const supabase = getMementoDb();
  const { data: rounds, error: roundsError } = await supabase
    .from("rounds")
    .select("id")
    .eq("user_id", userId)
    .eq("app_id", appId)
    .order("created_at", { ascending: false })
    .limit(RECENT_ROUND_LIMIT);
  if (roundsError) throw roundsError;
  if (!rounds?.length) return [];

  const { data: cards, error: cardsError } = await supabase
    .from("round_cards")
    .select("vocabulary_id, sentence")
    .in(
      "round_id",
      rounds.map((round) => round.id),
    )
    .in(
      "vocabulary_id",
      items.map((item) => item.id),
    )
    .order("created_at", { ascending: false });
  if (cardsError) throw cardsError;

  return collectRecentQuizSentences(cards ?? []);
}

export function collectRecentQuizSentences(
  cards: StoredQuizSentence[],
): RecentQuizSentence[] {
  const counts = new Map<string, number>();
  const seen = new Map<string, Set<string>>();
  const recent: RecentQuizSentence[] = [];

  for (const card of cards) {
    const vocabularyId = String(card.vocabulary_id);
    const normalized = normalizeQuizSentence(card.sentence);
    const itemSeen = seen.get(vocabularyId) ?? new Set<string>();
    if (
      itemSeen.has(normalized) ||
      (counts.get(vocabularyId) ?? 0) >= RECENT_SENTENCE_LIMIT_PER_ITEM
    ) {
      continue;
    }

    itemSeen.add(normalized);
    seen.set(vocabularyId, itemSeen);
    counts.set(vocabularyId, (counts.get(vocabularyId) ?? 0) + 1);
    recent.push({ vocabularyId, sentence: card.sentence });
  }

  return recent;
}
