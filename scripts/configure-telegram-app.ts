import { loadEnvConfig } from "@next/env";
import { APP_IDS, getLanguage, isAppId } from "../src/languages/registry";
import { readArgument } from "./cli-arguments";
import { configureTelegramApp } from "./configure-telegram-app-workflow";
import { z } from "zod";

const TelegramResponseSchema = z.object({
  ok: z.boolean(),
  description: z.string().optional(),
  result: z.unknown().optional(),
});

loadEnvConfig(process.cwd());

const args = process.argv.slice(2);
const requestedAppId = readArgument(args, "--app");
const rawBaseUrl = readArgument(args, "--base-url");

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

void configureTelegramApp(telegram, {
  webhookUrl,
  miniAppUrl,
  webhookSecret: secret,
})
  .then(() => {
    console.log(
      `Configured ${language.id}: webhook ${webhookUrl}, Mini App ${miniAppUrl}`,
    );
  })
  .catch((error: unknown) => {
    fail(error instanceof Error ? error.message : "Telegram configuration failed.");
  });

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

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}
