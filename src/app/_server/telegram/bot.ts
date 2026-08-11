import "server-only";

import { z } from "zod";
import type { AppId } from "@/app/app-config";
import { getLanguage } from "@/app/_languages/registry";

const TelegramResponseSchema = z.object({
  ok: z.boolean(),
  result: z.object({ message_id: z.number() }).optional(),
  description: z.string().optional(),
});

const TelegramFileResponseSchema = z.object({
  ok: z.boolean(),
  result: z.object({ file_path: z.string().optional() }).optional(),
  description: z.string().optional(),
});

const TelegramOkResponseSchema = z.object({
  ok: z.boolean(),
  description: z.string().optional(),
}).passthrough();

export type TelegramInlineButton = {
  text: string;
  callbackData: string;
};

export async function sendTelegramMessage(
  chatId: number,
  text: string,
  replyToMessageId?: number,
  parseMode?: "HTML",
  appId: AppId = "en",
  inlineKeyboard?: TelegramInlineButton[][],
): Promise<{ messageId: number }> {
  const language = getLanguage(appId);
  const token = process.env[language.botTokenEnv];
  if (!token) {
    throw new Error(`${language.botTokenEnv} is not configured`);
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
        ...(inlineKeyboard
          ? {
              reply_markup: {
                inline_keyboard: inlineKeyboard.map((row) =>
                  row.map((button) => ({
                    text: button.text,
                    callback_data: button.callbackData,
                  })),
                ),
              },
            }
          : {}),
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
  const messageId = payload.data.result?.message_id;
  if (!messageId) throw new Error("Telegram sendMessage returned no message ID");
  return { messageId };
}

export async function answerTelegramCallbackQuery(
  callbackQueryId: string,
  appId: AppId = "en",
): Promise<void> {
  await callTelegram(appId, "answerCallbackQuery", {
    callback_query_id: callbackQueryId,
  });
}

export async function editTelegramMessage(
  chatId: number,
  messageId: number,
  text: string,
  appId: AppId = "en",
): Promise<void> {
  await callTelegram(appId, "editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    reply_markup: { inline_keyboard: [] },
  });
}

export async function sendTelegramTyping(
  chatId: number,
  appId: AppId = "en",
): Promise<void> {
  await callTelegram(appId, "sendChatAction", {
    chat_id: chatId,
    action: "typing",
  });
}

export async function deleteTelegramMessage(
  chatId: number,
  messageId: number,
  appId: AppId = "en",
): Promise<void> {
  await callTelegram(appId, "deleteMessage", {
    chat_id: chatId,
    message_id: messageId,
  });
}

export async function getTelegramFile(
  fileId: string,
  appId: AppId = "en",
): Promise<{ filePath: string }> {
  const token = telegramToken(appId);
  const response = await fetch(
    `https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`,
  );
  const payload = TelegramFileResponseSchema.safeParse(
    await response.json().catch(() => null),
  );
  const filePath = payload.success ? payload.data.result?.file_path : undefined;
  if (!response.ok || !payload.success || !payload.data.ok || !filePath) {
    throw new Error("Telegram getFile failed");
  }
  return { filePath };
}

export async function downloadTelegramFile(
  filePath: string,
  appId: AppId = "en",
): Promise<Uint8Array> {
  const response = await fetch(
    `https://api.telegram.org/file/bot${telegramToken(appId)}/${filePath}`,
  );
  if (!response.ok) throw new Error(`Telegram download failed with HTTP ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

async function callTelegram(
  appId: AppId,
  method: string,
  body: Record<string, unknown>,
): Promise<void> {
  const response = await fetch(
    `https://api.telegram.org/bot${telegramToken(appId)}/${method}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  const payload = TelegramOkResponseSchema.safeParse(
    await response.json().catch(() => null),
  );
  if (!response.ok || !payload.success || !payload.data.ok) {
    throw new Error(`Telegram ${method} failed`);
  }
}

function telegramToken(appId: AppId): string {
  const language = getLanguage(appId);
  const token = process.env[language.botTokenEnv];
  if (!token) throw new Error(`${language.botTokenEnv} is not configured`);
  return token;
}
