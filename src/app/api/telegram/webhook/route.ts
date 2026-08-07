import { handleTelegramWebhook } from "@/lib/server/telegram-route";

export const maxDuration = 300;

export async function POST(request: Request) {
  return handleTelegramWebhook(request, "en");
}
