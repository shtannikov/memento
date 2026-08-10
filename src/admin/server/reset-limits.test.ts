import { beforeEach, describe, expect, it, vi } from "vitest";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock("./database", () => ({
  getAdminDatabase: () => ({ rpc }),
}));

import { resetDailyLimits } from "./reset-limits";

describe("admin daily limit reset", () => {
  beforeEach(() => rpc.mockReset());

  it("passes the exact user-app pair to the transactional RPC", async () => {
    rpc.mockResolvedValueOnce({
      data: { quizAttemptsReset: 5, speakingAttemptsReset: 2 },
      error: null,
    });

    await expect(resetDailyLimits(42, "en")).resolves.toEqual({
      quizAttemptsReset: 5,
      speakingAttemptsReset: 2,
    });
    expect(rpc).toHaveBeenCalledWith("admin_reset_daily_limits", {
      requested_user_id: 42,
      requested_app_id: "en",
    });
  });
});
