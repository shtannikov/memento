import { NextResponse } from "next/server";
import { z } from "zod";

import {
  readInitDataAuthorization,
  TelegramAuthError,
  type TelegramUser,
  validateTelegramInitData,
} from "./telegram-auth";

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function authenticateRequest(request: Request): TelegramUser {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new AppError("SERVER_NOT_CONFIGURED", "The app is not configured.", 503);
  return validateTelegramInitData(readInitDataAuthorization(request), token);
}

export async function parseJson<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<T> {
  const body: unknown = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new AppError("INVALID_REQUEST", "Please check the submitted data.", 400);
  }
  return parsed.data;
}

export function apiError(error: unknown): NextResponse {
  if (error instanceof TelegramAuthError) {
    return NextResponse.json(
      { code: error.code, message: error.message },
      { status: 401 },
    );
  }
  if (error instanceof AppError) {
    return NextResponse.json(
      { code: error.code, message: error.message, ...error.details },
      { status: error.status },
    );
  }
  console.error(error);
  return NextResponse.json(
    { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." },
    { status: 500 },
  );
}
