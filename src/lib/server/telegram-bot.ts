import "server-only";

import { z } from "zod";
import type { AppId } from "@/lib/domain/app";
import { getAppConfig, readAppSecret } from "./app-config";

const TelegramResponseSchema = z.object({
  ok: z.boolean(),
  description: z.string().optional(),
});

export async function sendTelegramMessage(
  chatId: number,
  text: string,
  replyToMessageId?: number,
  parseMode?: "HTML",
  appId: AppId = "en",
): Promise<void> {
  const token = readAppSecret(appId, "botToken");
  if (!token) {
    throw new Error(`${getAppConfig(appId).botTokenEnv} is not configured`);
  }

  const response = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        ...(parseMode ? { parse_mode: parseMode } : {}),
        ...(replyToMessageId
          ? {
              reply_parameters: {
                message_id: replyToMessageId,
                allow_sending_without_reply: true,
              },
            }
          : {}),
      }),
    },
  );
  const payload = TelegramResponseSchema.safeParse(
    await response.json().catch(() => null),
  );
  if (!response.ok || !payload.success || !payload.data.ok) {
    const description = payload.success
      ? payload.data.description
      : undefined;
    throw new Error(
      description
        ? `Telegram sendMessage failed: ${description}`
        : `Telegram sendMessage failed with HTTP ${response.status}`,
    );
  }
}
