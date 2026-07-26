export {};

const deploymentUrl = process.argv[2];
const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

if (!deploymentUrl) {
  throw new Error(
    "Usage: npm run telegram:webhook:set -- https://deployment.example",
  );
}
if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
if (!secret) throw new Error("TELEGRAM_WEBHOOK_SECRET is not configured");
if (secret.length > 256 || !/^[A-Za-z0-9_-]+$/.test(secret)) {
  throw new Error(
    "TELEGRAM_WEBHOOK_SECRET must be 1-256 letters, digits, underscores, or hyphens",
  );
}

const baseUrl = new URL(deploymentUrl);
if (baseUrl.protocol !== "https:") {
  throw new Error("Telegram webhooks require an HTTPS deployment URL");
}
const webhookUrl = new URL("/api/telegram/webhook", baseUrl);
const response = await fetch(
  `https://api.telegram.org/bot${token}/setWebhook`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl.toString(),
      secret_token: secret,
      allowed_updates: ["message"],
    }),
  },
);
const payload: unknown = await response.json().catch(() => null);
if (
  !response.ok ||
  !payload ||
  typeof payload !== "object" ||
  !("ok" in payload) ||
  payload.ok !== true
) {
  const description =
    payload &&
    typeof payload === "object" &&
    "description" in payload &&
    typeof payload.description === "string"
      ? payload.description
      : `HTTP ${response.status}`;
  throw new Error(`Telegram setWebhook failed: ${description}`);
}

console.log(`Telegram webhook set to ${webhookUrl.toString()}`);
