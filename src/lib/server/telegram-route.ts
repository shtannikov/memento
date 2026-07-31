import "server-only";

import { NextResponse } from "next/server";

import type { AppId } from "@/lib/domain/app";
import { sendTelegramMessage } from "./telegram-bot";
import {
  authenticateTelegramWebhook,
  TelegramWebhookConfigurationError,
} from "./telegram-webhook-auth";
import { parseTelegramUpdate, processTelegramUpdate } from "./telegram-webhook";

export async function handleTelegramWebhook(request: Request, appId: AppId) {
  try {
    if (!authenticateTelegramWebhook(request, appId)) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const body: unknown = await request.json().catch(() => null);
    const update = parseTelegramUpdate(body);
    if (!update) return NextResponse.json({ ok: false }, { status: 400 });

    const reply = await processTelegramUpdate(update, undefined, appId);
    if (reply) {
      await sendTelegramMessage(
        reply.chatId,
        reply.text,
        reply.replyToMessageId,
        reply.parseMode,
        appId,
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof TelegramWebhookConfigurationError) {
      console.error(error.message);
      return NextResponse.json({ ok: false }, { status: 503 });
    }
    console.error(error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
