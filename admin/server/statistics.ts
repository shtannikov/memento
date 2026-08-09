import "server-only";

import type { AdminUserAppRow } from "@admin/ui/admin.types";
import { getAdminDatabase } from "./database";

type StatsRow = {
  telegram_user_id: number;
  app_id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  joined_at: string;
  last_used_at: string;
  vocabulary_total: number;
  vocabulary_learning: number;
  vocabulary_practicing: number;
  vocabulary_learned: number;
  quizzes_completed: number;
  quiz_failures_total: number;
  quiz_failures_today: number;
  last_quiz_completed_at: string | null;
  speaking_completed: number;
  speaking_failures_total: number;
  speaking_failures_today: number;
  last_speaking_completed_at: string | null;
  quiz_attempts_today: number;
  speaking_attempts_today: number;
};

export async function loadAdminStatistics(): Promise<AdminUserAppRow[]> {
  const { data, error } = await getAdminDatabase().rpc("admin_list_user_app_stats");
  if (error) throw error;
  return ((data ?? []) as StatsRow[]).map(mapStatsRow);
}

export function mapStatsRow(row: StatsRow): AdminUserAppRow {
  return {
    telegramUserId: Number(row.telegram_user_id),
    appId: row.app_id,
    username: row.username,
    firstName: row.first_name,
    lastName: row.last_name,
    joinedAt: row.joined_at,
    lastUsedAt: row.last_used_at,
    vocabularyTotal: Number(row.vocabulary_total),
    vocabularyLearning: Number(row.vocabulary_learning),
    vocabularyPracticing: Number(row.vocabulary_practicing),
    vocabularyLearned: Number(row.vocabulary_learned),
    quizzesCompleted: Number(row.quizzes_completed),
    quizFailuresTotal: Number(row.quiz_failures_total),
    quizFailuresToday: Number(row.quiz_failures_today),
    lastQuizCompletedAt: row.last_quiz_completed_at,
    speakingCompleted: Number(row.speaking_completed),
    speakingFailuresTotal: Number(row.speaking_failures_total),
    speakingFailuresToday: Number(row.speaking_failures_today),
    lastSpeakingCompletedAt: row.last_speaking_completed_at,
    quizAttemptsToday: Number(row.quiz_attempts_today),
    speakingAttemptsToday: Number(row.speaking_attempts_today),
  };
}
