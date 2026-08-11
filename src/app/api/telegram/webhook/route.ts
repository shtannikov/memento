import { handleTelegramWebhook } from "@/app/_server/telegram/route";

export const maxDuration = 300;

export async function POST(request: Request) {
  return handleTelegramWebhook(request, "en");
}
