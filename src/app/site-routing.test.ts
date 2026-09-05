import { describe, expect, it } from "vitest";

import {
  isPomnenkaProductionRequest,
  isPomnenkaSiteRequest,
  pomnenkaPublicPath,
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

describe("isPomnenkaSiteRequest", () => {
  it("allows the Pomnenka landing to be inspected in Preview", () => {
    expect(
      isPomnenkaSiteRequest("feature.vercel.app", "pomnenka", "preview"),
    ).toBe(true);
  });

  it("ignores the Preview selector in Production", () => {
    expect(
      isPomnenkaSiteRequest("memento.example", "pomnenka", "production"),
    ).toBe(false);
  });
});

describe("pomnenkaPublicPath", () => {
  it("keeps Production links clean", () => {
    expect(pomnenkaPublicPath("/trial", "production")).toBe("/trial");
  });

  it("preserves the site selector in Preview links", () => {
    expect(pomnenkaPublicPath("/trial", "preview")).toBe(
      "/trial?site=pomnenka",
    );
  });
});
