import "server-only";

import { Buffer } from "node:buffer";
import { createHmac, timingSafeEqual } from "node:crypto";

import { getAdminDatabase } from "./database";

const MAX_AGE_SECONDS = 24 * 60 * 60;
const MAX_FUTURE_SKEW_SECONDS = 30;

export type AdminTelegramUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
};

export class AdminAuthError extends Error {
  constructor(
    public readonly code: "UNAUTHORIZED" | "INVALID_INIT_DATA" | "STALE_INIT_DATA" | "FORBIDDEN",
    message: string,
    public readonly status: 401 | 403 = 401,
  ) {
    super(message);
    this.name = "AdminAuthError";
  }
}

export function validateAdminInitData(
  initData: string,
  botToken: string,
  now = new Date(),
): AdminTelegramUser {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash") ?? "";
  if (!/^[a-f\d]{64}$/i.test(hash)) {
    throw new AdminAuthError("INVALID_INIT_DATA", "Telegram signature is missing.");
  }

  const checkString = [...params.entries()]
    .filter(([key]) => key !== "hash")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const expected = createHmac("sha256", secret).update(checkString).digest();
  const supplied = Buffer.from(hash, "hex");
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    throw new AdminAuthError("INVALID_INIT_DATA", "Telegram signature is invalid.");
  }

  const authDate = Number(params.get("auth_date"));
  const nowSeconds = Math.floor(now.getTime() / 1000);
  if (
    !Number.isSafeInteger(authDate) ||
    authDate <= 0 ||
    authDate > nowSeconds + MAX_FUTURE_SKEW_SECONDS ||
    nowSeconds - authDate > MAX_AGE_SECONDS
  ) {
    throw new AdminAuthError("STALE_INIT_DATA", "Telegram authorization has expired.");
  }

  const rawUser = params.get("user");
  let user: unknown;
  try {
    user = rawUser ? JSON.parse(rawUser) : null;
  } catch {
    user = null;
  }
  if (!isTelegramUser(user)) {
    throw new AdminAuthError("INVALID_INIT_DATA", "Telegram user is invalid.");
  }
  return user;
}

export async function authenticateAdminRequest(request: Request): Promise<AdminTelegramUser> {
  const authorization = request.headers.get("authorization") ?? "";
  const match = /^tma\s+(.+)$/i.exec(authorization);
  if (!match?.[1]) {
    throw new AdminAuthError("UNAUTHORIZED", "Telegram authorization is required.");
  }
  const token = process.env.TELEGRAM_ADMIN_BOT_TOKEN;
  if (!token) throw new Error("ADMIN_TELEGRAM_NOT_CONFIGURED");

  const user = validateAdminInitData(match[1], token);
  const { data, error } = await getAdminDatabase()
    .from("admin_users")
    .select("telegram_user_id")
    .eq("telegram_user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    throw new AdminAuthError("FORBIDDEN", "Access denied.", 403);
  }
  return user;
}

function isTelegramUser(value: unknown): value is AdminTelegramUser {
  return Boolean(
    value &&
      typeof value === "object" &&
      "id" in value &&
      typeof value.id === "number" &&
      Number.isSafeInteger(value.id) &&
      value.id > 0,
  );
}
