// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/app/api/_server/supabase", () => ({
  getMementoDb: () => ({ rpc }),
}));

import { purgeExpiredSpeakingTranscripts } from "./retention";

describe("speaking transcript retention", () => {
  it("runs the database purge and returns its affected-row count", async () => {
    rpc.mockResolvedValueOnce({ data: 4, error: null });
    await expect(purgeExpiredSpeakingTranscripts()).resolves.toBe(4);
    expect(rpc).toHaveBeenCalledWith("purge_expired_speaking_transcripts");
  });

  it("surfaces database failures", async () => {
    const error = new Error("database unavailable");
    rpc.mockResolvedValueOnce({ data: null, error });
    await expect(purgeExpiredSpeakingTranscripts()).rejects.toBe(error);
  });
});
