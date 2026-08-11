import { Buffer } from "node:buffer";
import { createHmac, timingSafeEqual } from "node:crypto";

const DEFAULT_MAX_AGE_SECONDS = 24 * 60 * 60;
const MAX_FUTURE_SKEW_SECONDS = 30;

export type TelegramUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
};

export class TelegramAuthError extends Error {
  constructor(
    public readonly code:
      | "UNAUTHORIZED"
      | "INVALID_INIT_DATA"
      | "STALE_INIT_DATA",
    message: string,
  ) {
    super(message);
    this.name = "TelegramAuthError";
  }
}

export function readInitDataAuthorization(request: Request): string {
  const authorization = request.headers.get("authorization") ?? "";
  const match = /^tma\s+(.+)$/i.exec(authorization);
  if (!match?.[1]) {
    throw new TelegramAuthError(
      "UNAUTHORIZED",
      "Telegram authorization is required",
    );
  }
  return match[1];
}

export function validateTelegramInitData(
  initData: string,
  botToken: string,
  options: { now?: Date; maxAgeSeconds?: number } = {},
): TelegramUser {
  if (!initData || !botToken) {
    throw new TelegramAuthError(
      "INVALID_INIT_DATA",
      "Telegram init data is incomplete",
    );
  }

  const params = new URLSearchParams(initData);
  const hash = params.get("hash") ?? "";
  if (!/^[a-f\d]{64}$/i.test(hash)) {
    throw new TelegramAuthError(
      "INVALID_INIT_DATA",
      "Telegram signature is missing",
    );
  }

  const checkString = [...params.entries()]
    .filter(([key]) => key !== "hash")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secret = createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();
  const expected = createHmac("sha256", secret)
    .update(checkString)
    .digest();
  const supplied = Buffer.from(hash, "hex");

  if (
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  ) {
    throw new TelegramAuthError(
      "INVALID_INIT_DATA",
      "Telegram signature is invalid",
    );
  }

  const authDate = Number(params.get("auth_date"));
  if (!Number.isSafeInteger(authDate) || authDate <= 0) {
    throw new TelegramAuthError(
      "INVALID_INIT_DATA",
      "Telegram auth date is invalid",
    );
  }
  const nowSeconds = Math.floor(
    (options.now ?? new Date()).getTime() / 1000,
  );
  const maxAge = options.maxAgeSeconds ?? DEFAULT_MAX_AGE_SECONDS;
  if (
    authDate > nowSeconds + MAX_FUTURE_SKEW_SECONDS ||
    nowSeconds - authDate > maxAge
  ) {
    throw new TelegramAuthError(
      "STALE_INIT_DATA",
      "Telegram authorization has expired",
    );
  }

  const rawUser = params.get("user");
  if (!rawUser) {
    throw new TelegramAuthError(
      "INVALID_INIT_DATA",
      "Telegram user is missing",
    );
  }

  let user: unknown;
  try {
    user = JSON.parse(rawUser);
  } catch {
    throw new TelegramAuthError(
      "INVALID_INIT_DATA",
      "Telegram user is invalid",
    );
  }
  if (!isTelegramUser(user)) {
    throw new TelegramAuthError(
      "INVALID_INIT_DATA",
      "Telegram user ID is invalid",
    );
  }
  return user;
}

function isTelegramUser(value: unknown): value is TelegramUser {
  return Boolean(
    value &&
      typeof value === "object" &&
      "id" in value &&
      typeof value.id === "number" &&
      Number.isSafeInteger(value.id) &&
      value.id > 0,
  );
}
