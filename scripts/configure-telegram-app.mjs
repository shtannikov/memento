const appId = readArgument("--app");
const rawBaseUrl = readArgument("--base-url");

if (!appId || !["en", "cz"].includes(appId)) {
  fail("Use --app en or --app cz.");
}
if (!rawBaseUrl) fail("Provide --base-url with the deployed HTTPS origin.");

const baseUrl = rawBaseUrl.replace(/\/+$/, "");
if (!baseUrl.startsWith("https://")) fail("--base-url must use HTTPS.");

const config =
  appId === "cz"
    ? {
        tokenEnv: "TELEGRAM_CZ_BOT_TOKEN",
        secretEnv: "TELEGRAM_CZ_WEBHOOK_SECRET",
        appPath: "/cz",
        webhookPath: "/api/telegram/webhook/cz",
      }
    : {
        tokenEnv: "TELEGRAM_BOT_TOKEN",
        secretEnv: "TELEGRAM_WEBHOOK_SECRET",
        appPath: "/",
        webhookPath: "/api/telegram/webhook",
      };

const token = process.env[config.tokenEnv];
const secret = process.env[config.secretEnv];
if (!token) fail(`${config.tokenEnv} is required.`);
if (!secret) fail(`${config.secretEnv} is required.`);

const webhookUrl = `${baseUrl}${config.webhookPath}`;
const miniAppUrl = `${baseUrl}${config.appPath}`;

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
if (webhookInfo.url !== webhookUrl) {
  fail(`Telegram returned an unexpected webhook URL: ${webhookInfo.url ?? "none"}`);
}

console.log(`Configured ${appId}: webhook ${webhookUrl}, Mini App ${miniAppUrl}`);

async function telegram(method, body) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.ok) {
    fail(`${method} failed: ${payload?.description ?? `HTTP ${response.status}`}`);
  }
  return payload.result;
}

function readArgument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
