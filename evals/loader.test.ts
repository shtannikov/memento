// @vitest-environment node

import { describe, expect, it } from "vitest";

import { loadEvalCases } from "./loader";

describe("language eval loader", () => {
  it("discovers every registered language beside its definition", async () => {
    const cases = await loadEvalCases();

    expect(cases.filter((evalCase) => evalCase.appId === "en")).toHaveLength(6);
    expect(cases.filter((evalCase) => evalCase.appId === "cz")).toHaveLength(2);
  });
});
