import { NextResponse } from "next/server";
import { z } from "zod";

import {
  APP_HEADER,
  DEFAULT_APP_ID,
  type AppId,
} from "@/app/app-config";
import { getLanguage, isAppId } from "@/app/_languages/registry";

import {
  readInitDataAuthorization,
  TelegramAuthError,
  type TelegramUser,
  validateTelegramInitData,
} from "./telegram/auth";

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

export type AuthenticatedRequest = {
  appId: AppId;
  user: TelegramUser;
};

export function authenticateRequest(request: Request): AuthenticatedRequest {
  const requestedApp = request.headers.get(APP_HEADER) ?? DEFAULT_APP_ID;
  if (!isAppId(requestedApp)) {
    throw new AppError("INVALID_APP", "This app is not supported.", 400);
  }
  const token = process.env[getLanguage(requestedApp).botTokenEnv];
  if (!token) throw new AppError("SERVER_NOT_CONFIGURED", "The app is not configured.", 503);
  return {
    appId: requestedApp,
    user: validateTelegramInitData(readInitDataAuthorization(request), token),
  };
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
