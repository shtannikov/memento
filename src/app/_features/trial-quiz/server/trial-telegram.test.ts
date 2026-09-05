import { describe, expect, it } from "vitest";

import { pomnenkaTelegramUrl, trialTelegramUrl } from "./trial-telegram";

describe("pomnenkaTelegramUrl", () => {
  it("opens the configured environment-specific bot", () => {
    expect(
      pomnenkaTelegramUrl({ TELEGRAM_CZ_BOT_USERNAME: "pomnenkastagebot" }),
    ).toBe("https://t.me/pomnenkastagebot");
  });

  it("refuses a Preview that would fall back to Production", () => {
    expect(() => pomnenkaTelegramUrl({ VERCEL_ENV: "preview" })).toThrow(
      "required for Preview",
    );
  });
});

describe("trialTelegramUrl", () => {
  it("uses the configured environment-specific bot", () => {
    expect(
      trialTelegramUrl({ TELEGRAM_CZ_BOT_USERNAME: "pomnenkastagebot" }),
    ).toBe("https://t.me/pomnenkastagebot?start=tiktok_trial");
  });

  it("uses the production bot outside Preview", () => {
    expect(trialTelegramUrl({ VERCEL_ENV: "production" })).toBe(
      "https://t.me/pomnenkaxbot?start=tiktok_trial",
    );
  });

  it("refuses a Preview that would fall back to Production", () => {
    expect(() => trialTelegramUrl({ VERCEL_ENV: "preview" })).toThrow(
      "required for Preview",
    );
  });
});
