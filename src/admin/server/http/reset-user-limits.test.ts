import { beforeEach, describe, expect, it, vi } from "vitest";

const { authenticate, reset } = vi.hoisted(() => ({
  authenticate: vi.fn(),
  reset: vi.fn(),
}));

vi.mock("../auth", () => ({ authenticateAdminRequest: authenticate }));
vi.mock("../reset-limits", () => ({ resetDailyLimits: reset }));

import { POST } from "./reset-user-limits";

describe("admin limit reset route", () => {
  beforeEach(() => {
    authenticate.mockReset();
    reset.mockReset();
  });

  it("resets one exact supported user-app pair", async () => {
    authenticate.mockResolvedValueOnce({ id: 7 });
    reset.mockResolvedValueOnce({ quizAttemptsReset: 3, speakingAttemptsReset: 1 });

    const response = await POST(
      new Request("https://example.test/api/admin/users/42/apps/en/reset", {
        method: "POST",
      }),
      { params: Promise.resolve({ userId: "42", appId: "en" }) },
    );

    expect(response.status).toBe(200);
    expect(reset).toHaveBeenCalledWith(42, "en");
    await expect(response.json()).resolves.toEqual({
      result: { quizAttemptsReset: 3, speakingAttemptsReset: 1 },
    });
  });

  it("rejects invalid users and unsupported apps before mutation", async () => {
    authenticate.mockResolvedValue({ id: 7 });

    const invalidUser = await POST(
      new Request("https://example.test", { method: "POST" }),
      { params: Promise.resolve({ userId: "unsafe", appId: "en" }) },
    );
    const invalidApp = await POST(
      new Request("https://example.test", { method: "POST" }),
      { params: Promise.resolve({ userId: "42", appId: "admin" }) },
    );

    expect(invalidUser.status).toBe(400);
    expect(invalidApp.status).toBe(400);
    expect(reset).not.toHaveBeenCalled();
  });
});
