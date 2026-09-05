import { describe, expect, it } from "vitest";

import {
  APP_IDS,
  getLanguage,
  getLanguageFromRoute,
  isAppId,
  isSiteLanguage,
} from "./registry";

describe("language registry", () => {
  it("keeps every language registration in its language definition", () => {
    expect(APP_IDS).toEqual(["en", "cz"]);
    expect(getLanguage("en")).toMatchObject({
      appName: "Memento",
      transcriptionLanguage: "en",
      appPath: "/",
      webhookPath: "/api/telegram/webhook",
      botTokenEnv: "TELEGRAM_BOT_TOKEN",
      addPhrasePlaceholders: {
        term: "e.g. to be in charge of sth",
        definition: "e.g. to have responsibility for sth",
      },
    });
    expect(getLanguage("cz")).toMatchObject({
      appName: "Pomněnka",
      locale: "cs-CZ",
      transcriptionLanguage: "cs",
      appPath: "/cz",
      webhookPath: "/api/telegram/webhook/cz",
      botTokenEnv: "TELEGRAM_CZ_BOT_TOKEN",
      site: {
        hostname: "pomnenka.me",
        productionBotUsername: "pomnenkaxbot",
        previewBotUsernameEnv: "TELEGRAM_CZ_BOT_USERNAME",
        coverImage: "/languages/cz/chat-cover.jpg",
        trial: {
          publicPath: "/trial",
          routePath: "/cz/trial",
          startPayload: "tiktok_trial",
        },
      },
      addPhrasePlaceholders: {
        term: "e.g. starat se o někoho",
        definition: "e.g. to take care of someone",
      },
    });
  });

  it("uses cz as the Czech product identifier and rejects unknown routes", () => {
    expect(isAppId("cz")).toBe(true);
    expect(isAppId("cs")).toBe(false);
    expect(isAppId("toString")).toBe(false);
    expect(getLanguageFromRoute("cz")?.id).toBe("cz");
    expect(getLanguageFromRoute("unknown")).toBeNull();
    expect(isSiteLanguage(getLanguage("cz"))).toBe(true);
    expect(isSiteLanguage(getLanguage("en"))).toBe(false);
  });

  it("keeps public hostnames unique across language manifests", () => {
    const hostnames = APP_IDS.map(getLanguage)
      .filter(isSiteLanguage)
      .map((language) => language.site.hostname);

    expect(new Set(hostnames).size).toBe(hostnames.length);
  });
});
