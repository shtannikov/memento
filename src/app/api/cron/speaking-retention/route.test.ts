// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

const purge = vi.hoisted(() => vi.fn());
vi.mock("@/app/_features/speaking/server/retention", () => ({
  purgeExpiredSpeakingTranscripts: purge,
}));

import { GET } from "./route";

const originalSecret = process.env.CRON_SECRET;

afterEach(() => {
  vi.clearAllMocks();
  if (originalSecret === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = originalSecret;
});

describe("speaking transcript retention cron route", () => {
  it("rejects requests without the Vercel cron secret", async () => {
    process.env.CRON_SECRET = "secret";
    const response = await GET(
      new Request("https://example.test/api/cron/speaking-retention"),
    );
    expect(response.status).toBe(401);
    expect(purge).not.toHaveBeenCalled();
  });

  it("purges expired transcripts without creating or sending tasks", async () => {
    process.env.CRON_SECRET = "secret";
    purge.mockResolvedValue(2);
    const response = await GET(
      new Request("https://example.test/api/cron/speaking-retention", {
        headers: { authorization: "Bearer secret" },
      }),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, purged: 2 });
    expect(purge).toHaveBeenCalledOnce();
  });
});
