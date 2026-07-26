import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  readInitDataAuthorization,
  TelegramAuthError,
  validateTelegramInitData,
} from "./telegram-auth";

const token = "123456:test-token";
const now = new Date("2026-07-26T12:00:00Z");

function signedInitData(
  user: { id: number; first_name?: string } = {
    id: 42,
    first_name: "Ada",
  },
  authDate = Math.floor(now.getTime() / 1000),
): string {
  const params = new URLSearchParams({
    auth_date: String(authDate),
    query_id: "query",
    user: JSON.stringify(user),
  });
  const check = [...params.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(token).digest();
  params.set("hash", createHmac("sha256", secret).update(check).digest("hex"));
  return params.toString();
}

describe("Telegram Mini App authentication", () => {
  it("accepts a valid signed Telegram user", () => {
    expect(validateTelegramInitData(signedInitData(), token, { now })).toEqual({
      id: 42,
      first_name: "Ada",
    });
  });

  it("rejects a changed payload", () => {
    const tampered = signedInitData().replace("Ada", "Eve");
    expect(() =>
      validateTelegramInitData(tampered, token, { now }),
    ).toThrowError(TelegramAuthError);
  });

  it("rejects missing signatures and invalid Telegram users", () => {
    expect(() =>
      validateTelegramInitData("auth_date=1", token, { now }),
    ).toThrow("signature is missing");
    expect(() =>
      validateTelegramInitData(
        signedInitData({ id: -1 }),
        token,
        { now },
      ),
    ).toThrow("user ID is invalid");
  });

  it("rejects authentication dates too far in the future", () => {
    const future = Math.floor(now.getTime() / 1000) + 31;
    expect(() =>
      validateTelegramInitData(signedInitData({ id: 42 }, future), token, {
        now,
      }),
    ).toThrow("expired");
  });

  it("rejects stale authentication", () => {
    const old = Math.floor(now.getTime() / 1000) - 86_401;
    expect(() =>
      validateTelegramInitData(signedInitData({ id: 42 }, old), token, {
        now,
      }),
    ).toThrow("expired");
  });

  it("reads only the tma authorization scheme", () => {
    expect(
      readInitDataAuthorization(
        new Request("https://example.test", {
          headers: { Authorization: "tma signed-data" },
        }),
      ),
    ).toBe("signed-data");
    expect(() =>
      readInitDataAuthorization(new Request("https://example.test")),
    ).toThrow("required");
    expect(() =>
      readInitDataAuthorization(
        new Request("https://example.test", {
          headers: { Authorization: "Bearer token" },
        }),
      ),
    ).toThrow("required");
  });
});
