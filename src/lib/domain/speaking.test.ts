import { describe, expect, it } from "vitest";

import { selectLeastPracticed } from "./speaking";

describe("speaking domain", () => {
  it("selects only among the least-practiced options", () => {
    expect(
      ["a", "b"],
    ).toContain(selectLeastPracticed(["a", "b", "c"], ["c", "c"], "u:d"));
    expect(() => selectLeastPracticed([], [], "key")).toThrow();
  });
});
