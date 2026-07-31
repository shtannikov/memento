import { z } from "zod";

const WebhookInfoSchema = z.object({ url: z.string() });

export type TelegramClient = (
  method: string,
  body: Record<string, unknown>,
) => Promise<unknown>;

export async function configureTelegramApp(
  telegram: TelegramClient,
  options: {
    webhookUrl: string;
    miniAppUrl: string;
    webhookSecret: string;
  },
): Promise<void> {
  await telegram("setWebhook", {
    url: options.webhookUrl,
    secret_token: options.webhookSecret,
    allowed_updates: ["message"],
    drop_pending_updates: false,
  });
  await telegram("setChatMenuButton", {
    menu_button: {
      type: "web_app",
      text: "App",
      web_app: { url: options.miniAppUrl },
    },
  });
  const webhookInfo = WebhookInfoSchema.safeParse(
    await telegram("getWebhookInfo", {}),
  );
  if (!webhookInfo.success || webhookInfo.data.url !== options.webhookUrl) {
    throw new Error(
      `Telegram returned an unexpected webhook URL: ${
        webhookInfo.success ? webhookInfo.data.url : "none"
      }`,
    );
  }
}
