// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
  purge: vi.fn(),
}));
vi.mock("@/lib/server/speaking/tasks", () => ({
  dispatchDailySpeakingTasks: mocks.dispatch,
}));
vi.mock("@/lib/server/speaking/retention", () => ({
  purgeExpiredSpeakingTranscripts: mocks.purge,
}));

import { GET } from "./route";

const originalSecret = process.env.CRON_SECRET;

afterEach(() => {
  vi.clearAllMocks();
  if (originalSecret === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = originalSecret;
});

describe("speaking cron route", () => {
  it("rejects requests without the Vercel cron secret", async () => {
    process.env.CRON_SECRET = "secret";
    const response = await GET(new Request("https://example.test/api/cron/speaking-tasks"));
    expect(response.status).toBe(401);
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });

  it("purges expired content and dispatches English tasks", async () => {
    process.env.CRON_SECRET = "secret";
    mocks.purge.mockResolvedValue(2);
    mocks.dispatch.mockResolvedValue({ delivered: 3, failed: 1 });
    const response = await GET(
      new Request("https://example.test/api/cron/speaking-tasks", {
        headers: { authorization: "Bearer secret" },
      }),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      purged: 2,
      delivered: 3,
      failed: 1,
    });
    expect(mocks.dispatch).toHaveBeenCalledWith("en");
  });
});
