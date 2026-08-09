import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

const { maybeSingle } = vi.hoisted(() => ({ maybeSingle: vi.fn() }));

vi.mock("./database", () => ({
  getAdminDatabase: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle }),
      }),
    }),
  }),
}));

import {
  AdminAuthError,
  authenticateAdminRequest,
  validateAdminInitData,
} from "./auth";

const token = "100:admin-token";
const now = new Date("2026-08-09T12:00:00.000Z");

afterEach(() => {
  vi.unstubAllEnvs();
  maybeSingle.mockReset();
});

function signedInitData(
  user: object = { id: 42, first_name: "Ada", username: "ada" },
  authDate = Math.floor(now.getTime() / 1000),
) {
  const params = new URLSearchParams({
    auth_date: String(authDate),
    query_id: "admin-query",
    user: JSON.stringify(user),
  });
  const checkString = [...params.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(token).digest();
  params.set("hash", createHmac("sha256", secret).update(checkString).digest("hex"));
  return params.toString();
}

describe("admin Telegram authentication", () => {
  it("accepts a fresh signed Telegram administrator identity", () => {
    expect(validateAdminInitData(signedInitData(), token, now)).toEqual({
      id: 42,
      first_name: "Ada",
      username: "ada",
    });
  });

  it("rejects a signature made with another bot token", () => {
    expect(() => validateAdminInitData(signedInitData(), "200:other", now)).toThrow(
      AdminAuthError,
    );
  });

  it("rejects stale init data and invalid Telegram users", () => {
    expect(() =>
      validateAdminInitData(signedInitData({ id: 42 }, 1), token, now),
    ).toThrow("expired");
    expect(() => validateAdminInitData(signedInitData({ id: -1 }), token, now)).toThrow(
      "user is invalid",
    );
  });

  it("requires the signed Telegram ID to be in the database allowlist", async () => {
    vi.stubEnv("TELEGRAM_ADMIN_BOT_TOKEN", token);
    maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    await expect(
      authenticateAdminRequest(
        new Request("https://example.test/api/admin/users", {
          headers: { Authorization: `tma ${signedInitData()}` },
        }),
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });

    maybeSingle.mockResolvedValueOnce({
      data: { telegram_user_id: 42 },
      error: null,
    });
    await expect(
      authenticateAdminRequest(
        new Request("https://example.test/api/admin/users", {
          headers: { Authorization: `tma ${signedInitData()}` },
        }),
      ),
    ).resolves.toMatchObject({ id: 42 });
  });
});
