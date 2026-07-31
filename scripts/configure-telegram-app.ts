import { APP_IDS, getLanguage, isAppId } from "../src/languages/registry";
import { z } from "zod";

const TelegramResponseSchema = z.object({
  ok: z.boolean(),
  description: z.string().optional(),
  result: z.unknown().optional(),
});
const WebhookInfoSchema = z.object({ url: z.string() });

const requestedAppId = readArgument("--app");
const rawBaseUrl = readArgument("--base-url");

if (!requestedAppId || !isAppId(requestedAppId)) {
  fail(`Use --app with one of: ${APP_IDS.join(", ")}.`);
}
if (!rawBaseUrl) fail("Provide --base-url with the deployed HTTPS origin.");

const language = getLanguage(requestedAppId);
const baseUrl = rawBaseUrl.replace(/\/+$/, "");
if (!baseUrl.startsWith("https://")) fail("--base-url must use HTTPS.");

const token = process.env[language.botTokenEnv];
const secret = process.env[language.webhookSecretEnv];
if (!token) fail(`${language.botTokenEnv} is required.`);
if (!secret) fail(`${language.webhookSecretEnv} is required.`);

const webhookUrl = `${baseUrl}${language.webhookPath}`;
const miniAppUrl = `${baseUrl}${language.appPath}`;

await telegram("setWebhook", {
  url: webhookUrl,
  secret_token: secret,
  allowed_updates: ["message"],
  drop_pending_updates: false,
});
await telegram("setChatMenuButton", {
  menu_button: {
    type: "web_app",
    text: "App",
    web_app: { url: miniAppUrl },
  },
});
const webhookInfo = await telegram("getWebhookInfo", {});
const parsedWebhookInfo = WebhookInfoSchema.safeParse(webhookInfo);
if (!parsedWebhookInfo.success || parsedWebhookInfo.data.url !== webhookUrl) {
  fail(
    `Telegram returned an unexpected webhook URL: ${
      parsedWebhookInfo.success
        ? parsedWebhookInfo.data.url
        : "none"
    }`,
  );
}

console.log(
  `Configured ${language.id}: webhook ${webhookUrl}, Mini App ${miniAppUrl}`,
);

async function telegram(
  method: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  const response = await fetch(
    `https://api.telegram.org/bot${token}/${method}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  const payload = TelegramResponseSchema.safeParse(
    await response.json().catch(() => null),
  );
  if (!response.ok || !payload.success || payload.data.ok !== true) {
    fail(
      `${method} failed: ${
        payload.success && payload.data.description
          ? payload.data.description
          : `HTTP ${response.status}`
      }`,
    );
  }
  return payload.data.result;
}

function readArgument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}
