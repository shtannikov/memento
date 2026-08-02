import { afterEach, describe, expect, it, vi } from "vitest";

import {
  changeVocabularyStatus,
  reorderPracticingVocabulary,
} from "./api";

afterEach(() => {
  vi.unstubAllGlobals();
});

function successfulFetch() {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        vocabulary: { learning: [], practicing: [], learned: [] },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("vocabulary API client", () => {
  it("uses the return action when moving Practicing back to Learning", async () => {
    const fetchMock = successfulFetch();

    await changeVocabularyStatus(
      "signed-data",
      "en",
      "7",
      "practicing",
      "learning",
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/vocabulary/7",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ action: "return" }),
      }),
    );
  });

  it("sends the complete Practicing order", async () => {
    const fetchMock = successfulFetch();

    await reorderPracticingVocabulary("signed-data", "en", ["3", "1", "2"]);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/vocabulary/order",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ ids: ["3", "1", "2"] }),
      }),
    );
  });
});
