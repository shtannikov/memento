import type { AppId } from "@/app/app-config";
import { sendTelegramTyping } from "@/app/_server/telegram/bot";

const TYPING_REFRESH_INTERVAL_MS = 4000;

export async function runWithTelegramTyping<T>(
  chatId: number,
  appId: AppId,
  operation: () => Promise<T>,
  sendTyping: typeof sendTelegramTyping = sendTelegramTyping,
): Promise<T> {
  await sendTyping(chatId, appId);
  const interval = setInterval(() => {
    void sendTyping(chatId, appId).catch(() => undefined);
  }, TYPING_REFRESH_INTERVAL_MS);

  try {
    return await operation();
  } finally {
    clearInterval(interval);
  }
}
