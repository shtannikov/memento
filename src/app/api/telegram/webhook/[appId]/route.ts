import { NextResponse } from "next/server";

import { DEFAULT_APP_ID } from "@/app/app-config";
import { handleTelegramWebhook } from "@/app/api/_server/telegram/route";
import { getLanguageFromRoute } from "@/app/_languages/registry";

export const maxDuration = 300;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ appId: string }> },
) {
  const { appId: routeAppId } = await params;
  const language = getLanguageFromRoute(routeAppId);
  if (!language || language.id === DEFAULT_APP_ID) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }
  return handleTelegramWebhook(request, language.id);
}
