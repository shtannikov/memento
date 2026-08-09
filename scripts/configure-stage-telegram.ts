import { pathToFileURL } from "node:url";

import { APP_IDS, getLanguage } from "../src/languages/registry";

type Fetch = typeof fetch;

type TelegramResponse<T> = {
  ok: boolean;
  result?: T;
  description?: string;
};

type TelegramUser = {
  id: number;
  username?: string;
};

type WebhookInfo = {
  url: string;
};

type MenuButton = {
  type: string;
  text?: string;
  web_app?: { url: string };
};

export type StageTelegramTarget = {
  appId: string;
  appName: string;
  token: string;
  menuButtonText: string;
  miniAppUrl: string;
  webhookSecret?: string;
  webhookUrl?: string;
};

const PRODUCTION_HOSTNAMES = new Set([
  "memento.vercel.app",
  "memento-weld.vercel.app",
  "memento-shtannikov.vercel.app",
  "memento-git-main-shtannikov.vercel.app",
]);

export function parseStageOrigin(
  rawUrl: string,
  deploymentEnvironment: string,
): URL {
  if (deploymentEnvironment !== "Preview") {
    throw new Error(
      `Refusing to configure Telegram for ${deploymentEnvironment || "an unknown environment"}; expected Preview.`,
    );
  }

  const url = new URL(rawUrl);
  const hostname = url.hostname.toLowerCase();

  if (
    url.protocol !== "https:" ||
    !hostname.endsWith(".vercel.app") ||
    PRODUCTION_HOSTNAMES.has(hostname) ||
    hostname.includes("-git-main-") ||
    url.username ||
    url.password ||
    url.port ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error(`Refusing non-Preview Stage URL: ${rawUrl}`);
  }

  return url;
}

export function createStageTargets(
  origin: URL,
  environment: Record<string, string | undefined> = process.env,
): StageTelegramTarget[] {
  const languageTargets = APP_IDS.map((appId) => {
    const language = getLanguage(appId);
    const token = requireSecret(environment, language.botTokenEnv);
    const webhookSecret = requireSecret(
      environment,
      language.webhookSecretEnv,
    );

    if (!/^\d+:[A-Za-z0-9_-]+$/.test(token)) {
      throw new Error(`${language.botTokenEnv} is not a valid bot token.`);
    }
    if (!/^[A-Za-z0-9_-]{1,256}$/.test(webhookSecret)) {
      throw new Error(
        `${language.webhookSecretEnv} must contain 1-256 characters from A-Z, a-z, 0-9, _ and - only.`,
      );
    }

    return {
      appId,
      appName: language.appName,
      token,
      menuButtonText: "App",
      webhookSecret,
      webhookUrl: new URL(language.webhookPath, origin).toString(),
      miniAppUrl: new URL(language.appPath, origin).toString(),
    };
  });

  const adminToken = requireSecret(environment, "TELEGRAM_ADMIN_BOT_TOKEN");
  if (!/^\d+:[A-Za-z0-9_-]+$/.test(adminToken)) {
    throw new Error("TELEGRAM_ADMIN_BOT_TOKEN is not a valid bot token.");
  }
  return [
    ...languageTargets,
    {
      appId: "admin",
      appName: "Memento Admin",
      token: adminToken,
      menuButtonText: "Admin",
      miniAppUrl: new URL("/admin", origin).toString(),
    },
  ];
}

export async function configureStageTelegram(
  targets: StageTelegramTarget[],
  fetchImpl: Fetch = fetch,
): Promise<string[]> {
  const bots = await Promise.all(
    targets.map(async (target) => ({
      target,
      user: await callTelegram<TelegramUser>(
        target.token,
        "getMe",
        {},
        fetchImpl,
      ),
    })),
  );

  const configured: string[] = [];
  for (const { target, user } of bots) {
    if (target.webhookUrl && target.webhookSecret) {
      await callTelegram(
        target.token,
        "setWebhook",
        {
          url: target.webhookUrl,
          secret_token: target.webhookSecret,
        },
        fetchImpl,
      );
    }
    await callTelegram(
      target.token,
      "setChatMenuButton",
      {
        menu_button: {
          type: "web_app",
          text: target.menuButtonText,
          web_app: { url: target.miniAppUrl },
        },
      },
      fetchImpl,
    );

    const webhook = target.webhookUrl
      ? await callTelegram<WebhookInfo>(
          target.token,
          "getWebhookInfo",
          {},
          fetchImpl,
        )
      : null;
    const menuButton = await callTelegram<MenuButton>(
      target.token,
      "getChatMenuButton",
      {},
      fetchImpl,
    );

    if (webhook && webhook.url !== target.webhookUrl) {
      throw new Error(`Webhook verification failed for ${target.appName}.`);
    }
    if (
      menuButton.type !== "web_app" ||
      menuButton.text !== target.menuButtonText ||
      menuButton.web_app?.url !== target.miniAppUrl
    ) {
      throw new Error(`Menu button verification failed for ${target.appName}.`);
    }

    configured.push(
      `${target.appName} (@${user.username ?? user.id}): ${target.miniAppUrl}`,
    );
  }

  return configured;
}

async function callTelegram<T>(
  token: string,
  method: string,
  body: object,
  fetchImpl: Fetch,
): Promise<T> {
  const response = await fetchImpl(
    `https://api.telegram.org/bot${token}/${method}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  const payload = (await response.json()) as TelegramResponse<T>;

  if (!response.ok || !payload.ok || payload.result === undefined) {
    throw new Error(
      `Telegram ${method} failed: ${payload.description ?? `HTTP ${response.status}`}`,
    );
  }

  return payload.result;
}

function requireSecret(
  environment: Record<string, string | undefined>,
  variableName: string,
): string {
  const value = environment[variableName];
  if (!value) throw new Error(`Missing Stage secret ${variableName}.`);
  return value;
}

async function main() {
  const [rawUrl = "", deploymentEnvironment = ""] = process.argv.slice(2);
  const origin = parseStageOrigin(rawUrl, deploymentEnvironment);
  const targets = createStageTargets(origin);
  const configured = await configureStageTelegram(targets);

  console.log("Stage Telegram configuration verified:");
  for (const line of configured) console.log(`- ${line}`);
}

const entryPoint = process.argv[1]
  ? pathToFileURL(process.argv[1]).href
  : undefined;

if (entryPoint === import.meta.url) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
