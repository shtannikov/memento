// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  ensureUserAndSeed: vi.fn(),
  loadVocabulary: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/server/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/api")>()),
  authenticateRequest: mocks.authenticateRequest,
}));
vi.mock("@/server/supabase", () => ({
  getMementoDb: () => ({ rpc: mocks.rpc }),
}));
vi.mock("@/features/vocabulary/server/vocabulary", () => ({
  ensureUserAndSeed: mocks.ensureUserAndSeed,
  loadVocabulary: mocks.loadVocabulary,
  resetSchedule: vi.fn(),
}));

import { PATCH } from "./route";

function request(action: string) {
  return new Request("https://example.test/api/vocabulary/7", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.authenticateRequest.mockReturnValue({
    appId: "en",
    user: { id: 42, first_name: "Ada" },
  });
  mocks.ensureUserAndSeed.mockResolvedValue(undefined);
  mocks.rpc.mockResolvedValue({ data: true, error: null });
  mocks.loadVocabulary.mockResolvedValue({
    learning: [],
    practicing: [],
    learned: [],
  });
});

describe("vocabulary status route", () => {
  it("returns a Practicing phrase to Learning through the scoped RPC", async () => {
    const response = await PATCH(request("return"), {
      params: Promise.resolve({ id: "7" }),
    });

    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith(
      "return_vocabulary_to_learning",
      {
        requested_vocabulary_id: 7,
        requested_user_id: 42,
        requested_app_id: "en",
      },
    );
  });

  it("rejects return when speaking practice is unavailable", async () => {
    mocks.authenticateRequest.mockReturnValue({
      appId: "cz",
      user: { id: 42, first_name: "Ada" },
    });

    const response = await PATCH(request("return"), {
      params: Promise.resolve({ id: "7" }),
    });

    expect(response.status).toBe(409);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
