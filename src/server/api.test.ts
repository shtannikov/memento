// @vitest-environment node

import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";

import { authenticateRequest } from "./api";

const originalEnglishToken = process.env.TELEGRAM_BOT_TOKEN;
const originalCzechToken = process.env.TELEGRAM_CZ_BOT_TOKEN;

afterEach(() => {
  restore("TELEGRAM_BOT_TOKEN", originalEnglishToken);
  restore("TELEGRAM_CZ_BOT_TOKEN", originalCzechToken);
});

describe("app-aware API authentication", () => {
  it("validates Czech requests only with the Czech bot token", () => {
    process.env.TELEGRAM_BOT_TOKEN = "100:english";
    process.env.TELEGRAM_CZ_BOT_TOKEN = "200:czech";
    const initData = signedInitData("200:czech");
    const request = new Request("https://example.test/api/vocabulary", {
      headers: {
        Authorization: `tma ${initData}`,
        "X-Memento-App": "cz",
      },
    });

    expect(authenticateRequest(request)).toEqual({
      appId: "cz",
      user: { id: 42, first_name: "Ada" },
    });

    const wrongApp = new Request(request, {
      headers: { Authorization: `tma ${initData}`, "X-Memento-App": "en" },
    });
    expect(() => authenticateRequest(wrongApp)).toThrow("signature is invalid");
  });

  it("defaults legacy requests to English and rejects unknown apps", () => {
    process.env.TELEGRAM_BOT_TOKEN = "100:english";
    expect(
      authenticateRequest(
        new Request("https://example.test/api/vocabulary", {
          headers: { Authorization: `tma ${signedInitData("100:english")}` },
        }),
      ).appId,
    ).toBe("en");
    expect(() =>
      authenticateRequest(
        new Request("https://example.test/api/vocabulary", {
          headers: { "X-Memento-App": "cs" },
        }),
      ),
    ).toThrow("not supported");
  });
});

function signedInitData(token: string) {
  const params = new URLSearchParams({
    auth_date: String(Math.floor(Date.now() / 1000)),
    query_id: "query",
    user: JSON.stringify({ id: 42, first_name: "Ada" }),
  });
  const check = [...params.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(token).digest();
  params.set("hash", createHmac("sha256", secret).update(check).digest("hex"));
  return params.toString();
}

function restore(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
