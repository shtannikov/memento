import { describe, expect, it } from "vitest";

import { CZECH_LANGUAGE } from "@/app/_languages/cz";
import { languageTelegramUrl } from "./language-site";

describe("languageTelegramUrl", () => {
  it("uses the language site's configured Preview bot", () => {
    expect(
      languageTelegramUrl(CZECH_LANGUAGE, undefined, {
        TELEGRAM_CZ_BOT_USERNAME: "pomnenkastagebot",
      }),
    ).toBe("https://t.me/pomnenkastagebot");
  });

  it("adds a start payload when requested", () => {
    expect(
      languageTelegramUrl(CZECH_LANGUAGE, "weekly trial", {
        VERCEL_ENV: "production",
      }),
    ).toBe("https://t.me/pomnenkaxbot?start=weekly%20trial");
  });
});
