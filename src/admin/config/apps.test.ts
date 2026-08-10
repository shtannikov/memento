import { describe, expect, it } from "vitest";

import { getAdminApp, isAdminAppId } from "./apps";

describe("admin app configuration", () => {
  it("marks only configured learning apps as supported", () => {
    expect(isAdminAppId("en")).toBe(true);
    expect(isAdminAppId("cz")).toBe(true);
    expect(isAdminAppId("admin")).toBe(false);
    expect(getAdminApp("future")).toEqual({
      name: "FUTURE",
      speakingEnabled: false,
    });
  });
});
