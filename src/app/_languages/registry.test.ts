import { describe, expect, it } from "vitest";

import { APP_IDS, getLanguage, getLanguageFromRoute, isAppId } from "./registry";

describe("language registry", () => {
  it("keeps every language registration in its language definition", () => {
    expect(APP_IDS).toEqual(["en", "cz"]);
    expect(getLanguage("en")).toMatchObject({
      appName: "Memento",
      transcriptionLanguage: "en",
      appPath: "/",
      webhookPath: "/api/telegram/webhook",
      botTokenEnv: "TELEGRAM_BOT_TOKEN",
    });
    expect(getLanguage("cz")).toMatchObject({
      appName: "Pomněnka",
      locale: "cs-CZ",
      transcriptionLanguage: "cs",
      appPath: "/cz",
      webhookPath: "/api/telegram/webhook/cz",
      botTokenEnv: "TELEGRAM_CZ_BOT_TOKEN",
    });
  });

  it("uses cz as the Czech product identifier and rejects unknown routes", () => {
    expect(isAppId("cz")).toBe(true);
    expect(isAppId("cs")).toBe(false);
    expect(isAppId("toString")).toBe(false);
    expect(getLanguageFromRoute("cz")?.id).toBe("cz");
    expect(getLanguageFromRoute("unknown")).toBeNull();
  });
});
