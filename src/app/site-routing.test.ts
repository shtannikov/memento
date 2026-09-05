import { describe, expect, it } from "vitest";

import {
  isPomnenkaProductionRequest,
  titleForSite,
} from "./site-routing";

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

describe("titleForSite", () => {
  it("uses Pomnenka branding for the Pomnenka site", () => {
    expect(titleForSite("Memento Admin", "pomnenka")).toBe("Pomněnka Admin");
  });

  it("keeps the default title for other sites", () => {
    expect(titleForSite("Memento", null)).toBe("Memento");
  });
});
