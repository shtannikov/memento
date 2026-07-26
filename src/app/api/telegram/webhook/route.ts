import { NextResponse } from "next/server";

import { sendTelegramMessage } from "@/lib/server/telegram-bot";
import {
  authenticateTelegramWebhook,
  TelegramWebhookConfigurationError,
} from "@/lib/server/telegram-webhook-auth";
import {
  parseTelegramUpdate,
  processTelegramUpdate,
} from "@/lib/server/telegram-webhook";

export async function POST(request: Request) {
  try {
    if (!authenticateTelegramWebhook(request)) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const body: unknown = await request.json().catch(() => null);
    const update = parseTelegramUpdate(body);
    if (!update) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const reply = await processTelegramUpdate(update);
    if (reply) {
      await sendTelegramMessage(
        reply.chatId,
        reply.text,
        reply.replyToMessageId,
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
