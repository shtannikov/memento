import { describe, expect, it } from "vitest";

import { readArgument } from "./cli-arguments";

describe("script CLI arguments", () => {
  it("reads a named value without depending on argument order", () => {
    expect(
      readArgument(["--base-url", "https://example.test", "--app", "cz"], "--app"),
    ).toBe("cz");
  });

  it("returns undefined for missing values and flags", () => {
    expect(readArgument(["--app"], "--app")).toBeUndefined();
    expect(readArgument([], "--app")).toBeUndefined();
  });
});
