import { handleTelegramWebhook } from "@/lib/server/telegram-route";

export async function POST(request: Request) {
  return handleTelegramWebhook(request, "en");
}
