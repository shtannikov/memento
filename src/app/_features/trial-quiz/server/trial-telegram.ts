import "server-only";

const PRODUCTION_CZECH_BOT_USERNAME = "pomnenkaxbot";
const BOT_USERNAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]{4,31}$/;

function czechBotUsername(
  environment: Record<string, string | undefined>,
): string {
  const configured = environment.TELEGRAM_CZ_BOT_USERNAME?.trim();
  if (!configured && environment.VERCEL_ENV === "preview") {
    throw new Error(
      "TELEGRAM_CZ_BOT_USERNAME is required for Preview builds",
    );
  }
  const username = configured ?? PRODUCTION_CZECH_BOT_USERNAME;
  if (!BOT_USERNAME_PATTERN.test(username)) {
    throw new Error("TELEGRAM_CZ_BOT_USERNAME is not a valid bot username");
  }
  return username;
}

export function pomnenkaTelegramUrl(
  environment: Record<string, string | undefined> = process.env,
): string {
  return `https://t.me/${czechBotUsername(environment)}`;
}

export function trialTelegramUrl(
  environment: Record<string, string | undefined> = process.env,
): string {
  return `${pomnenkaTelegramUrl(environment)}?start=tiktok_trial`;
}
