import { describe, expect, it } from "vitest";

import { CZECH_LANGUAGE } from "@/app/_languages/cz";
import {
  getSiteLanguageForRequest,
  getSiteLanguageFromHeader,
  sitePublicPath,
} from "./site-routing";

describe("getSiteLanguageForRequest", () => {
  it("selects a Production site from the language registry hostname", () => {
    expect(
      getSiteLanguageForRequest("pomnenka.me", null, "production")?.id,
    ).toBe("cz");
  });

  it("selects a configured language site explicitly in Preview", () => {
    expect(
      getSiteLanguageForRequest("feature.vercel.app", "cz", "preview")?.id,
    ).toBe("cz");
  });

  it("does not select languages without a public site", () => {
    expect(
      getSiteLanguageForRequest("feature.vercel.app", "en", "preview"),
    ).toBeNull();
  });

  it("ignores Preview selectors in Production", () => {
    expect(
      getSiteLanguageForRequest("memento.example", "cz", "production"),
    ).toBeNull();
  });
});

describe("getSiteLanguageFromHeader", () => {
  it("resolves only configured public sites", () => {
    expect(getSiteLanguageFromHeader("cz")?.appName).toBe("Pomněnka");
    expect(getSiteLanguageFromHeader("en")).toBeNull();
    expect(getSiteLanguageFromHeader("unknown")).toBeNull();
  });
});

describe("sitePublicPath", () => {
  it("keeps Production links clean", () => {
    expect(sitePublicPath(CZECH_LANGUAGE, "/trial", "production")).toBe(
      "/trial",
    );
  });

  it("preserves the app selector in Preview links", () => {
    expect(sitePublicPath(CZECH_LANGUAGE, "/trial", "preview")).toBe(
      "/trial?site=cz",
    );
  });
});
