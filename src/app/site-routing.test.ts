import { describe, expect, it } from "vitest";

import { isPomnenkaProductionRequest } from "./site-routing";

describe("isPomnenkaProductionRequest", () => {
  it("matches the Pomnenka production domain", () => {
    expect(isPomnenkaProductionRequest("pomnenka.me", "production")).toBe(
      true,
    );
  });

  it.each(["preview", "development"])(
    "does not activate in the %s environment",
    (environment) => {
      expect(isPomnenkaProductionRequest("pomnenka.me", environment)).toBe(
        false,
      );
    },
  );

  it("does not activate for another production domain", () => {
    expect(isPomnenkaProductionRequest("memento.example", "production")).toBe(
      false,
    );
  });
});
