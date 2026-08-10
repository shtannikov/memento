import { beforeEach, describe, expect, it, vi } from "vitest";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock("./database", () => ({
  getAdminDatabase: () => ({ rpc }),
}));

import { loadAdminStatistics, mapStatsRow } from "./statistics";

describe("admin statistics mapping", () => {
  beforeEach(() => rpc.mockReset());

  it("maps database snake case and bigint-like values for the client", () => {
    expect(
      mapStatsRow({
        telegram_user_id: 42,
        app_id: "en",
        username: "ada",
        first_name: "Ada",
        last_name: "Lovelace",
        joined_at: "2026-08-01T10:00:00Z",
        last_used_at: "2026-08-09T10:00:00Z",
        vocabulary_total: 12,
        vocabulary_learning: 5,
        vocabulary_practicing: 4,
        vocabulary_learned: 3,
        quizzes_completed: 8,
        last_quiz_completed_at: "2026-08-08T10:00:00Z",
        speaking_completed: 2,
        last_speaking_completed_at: null,
        quiz_attempts_today: 4,
        speaking_attempts_today: 1,
      }),
    ).toEqual(
      expect.objectContaining({
        telegramUserId: 42,
        appId: "en",
        vocabularyTotal: 12,
        quizzesCompleted: 8,
        speakingAttemptsToday: 1,
      }),
    );
  });

  it("loads the database-ordered list from the admin RPC", async () => {
    rpc.mockResolvedValueOnce({
      data: [{
        telegram_user_id: 42,
        app_id: "cz",
        username: null,
        first_name: "Ada",
        last_name: null,
        joined_at: "2026-08-01T10:00:00Z",
        last_used_at: "2026-08-09T10:00:00Z",
        vocabulary_total: 10,
        vocabulary_learning: 10,
        vocabulary_practicing: 0,
        vocabulary_learned: 0,
        quizzes_completed: 0,
        last_quiz_completed_at: null,
        speaking_completed: 0,
        last_speaking_completed_at: null,
        quiz_attempts_today: 0,
        speaking_attempts_today: 0,
      }],
      error: null,
    });

    await expect(loadAdminStatistics()).resolves.toEqual([
      expect.objectContaining({ telegramUserId: 42, appId: "cz" }),
    ]);
    expect(rpc).toHaveBeenCalledWith("admin_list_user_app_stats");
  });
});
