import { NextResponse } from "next/server";

import { isAdminAppId } from "@admin/config/apps";
import { authenticateAdminRequest } from "../auth";
import { resetDailyLimits } from "../reset-limits";
import { adminApiError } from "./responses";

type ResetRouteContext = {
  params: Promise<{ userId: string; appId: string }>;
};

export async function POST(request: Request, context: ResetRouteContext) {
  try {
    await authenticateAdminRequest(request);
    const { userId: rawUserId, appId } = await context.params;
    const userId = Number(rawUserId);
    if (!/^\d+$/.test(rawUserId) || !Number.isSafeInteger(userId) || userId <= 0) {
      return NextResponse.json(
        { code: "INVALID_USER", message: "Telegram user ID is invalid." },
        { status: 400 },
      );
    }
    if (!isAdminAppId(appId)) {
      return NextResponse.json(
        { code: "INVALID_APP", message: "This app is not supported." },
        { status: 400 },
      );
    }
    return NextResponse.json({ result: await resetDailyLimits(userId, appId) });
  } catch (error) {
    return adminApiError(error);
  }
}
