// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  ensureUserAndSeed: vi.fn(),
  loadVocabulary: vi.fn(),
  reorderPracticingVocabulary: vi.fn(),
}));

vi.mock("@/app/api/_server/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/app/api/_server/api")>()),
  authenticateRequest: mocks.authenticateRequest,
}));
vi.mock("@/app/_features/vocabulary/server/vocabulary", () => ({
  ensureUserAndSeed: mocks.ensureUserAndSeed,
  loadVocabulary: mocks.loadVocabulary,
  reorderPracticingVocabulary: mocks.reorderPracticingVocabulary,
}));

import { PUT } from "./route";

function request(body: unknown) {
  return new Request("https://example.test/api/vocabulary/order", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.authenticateRequest.mockReturnValue({
    appId: "en",
    user: { id: 42, first_name: "Ada" },
  });
  mocks.ensureUserAndSeed.mockResolvedValue(undefined);
  mocks.reorderPracticingVocabulary.mockResolvedValue(undefined);
  mocks.loadVocabulary.mockResolvedValue({
    learning: [],
    practicing: [],
    learned: [],
  });
});

describe("practicing vocabulary order route", () => {
  it("persists an authenticated order and returns refreshed vocabulary", async () => {
    const response = await PUT(request({ ids: ["3", "1", "2"] }));

    expect(response.status).toBe(200);
    expect(mocks.reorderPracticingVocabulary).toHaveBeenCalledWith(
      42,
      "en",
      ["3", "1", "2"],
    );
    await expect(response.json()).resolves.toEqual({
      vocabulary: { learning: [], practicing: [], learned: [] },
    });
  });

  it("rejects duplicate or non-numeric IDs before changing the queue", async () => {
    expect((await PUT(request({ ids: ["1", "1"] }))).status).toBe(400);
    expect((await PUT(request({ ids: ["phrase"] }))).status).toBe(400);
    expect(mocks.reorderPracticingVocabulary).not.toHaveBeenCalled();
  });
});
