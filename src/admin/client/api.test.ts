import { afterEach, describe, expect, it, vi } from "vitest";

import { loadAdminUsers, resetAdminLimits } from "./api";

afterEach(() => vi.unstubAllGlobals());

describe("admin API client", () => {
  it("loads all rows with Telegram authorization", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ users: [] }), {
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadAdminUsers("signed-data")).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/users",
      expect.objectContaining({ headers: { Authorization: "tma signed-data" } }),
    );
  });

  it("resets one exact user and app", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ result: { quizAttemptsReset: 5, speakingAttemptsReset: 2 } }),
        { headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(resetAdminLimits("signed", 42, "en")).resolves.toEqual({
      quizAttemptsReset: 5,
      speakingAttemptsReset: 2,
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/admin/users/42/apps/en/reset");
  });
});
