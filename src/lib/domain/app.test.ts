import { describe, expect, it } from "vitest";

import { appPath, isAppId } from "./app";

describe("app identity", () => {
  it("uses cz as the Czech product identifier", () => {
    expect(isAppId("en")).toBe(true);
    expect(isAppId("cz")).toBe(true);
    expect(isAppId("cs")).toBe(false);
    expect(appPath("en")).toBe("/");
    expect(appPath("cz")).toBe("/cz");
  });
});
