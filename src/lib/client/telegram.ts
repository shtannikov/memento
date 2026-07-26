export type TelegramWebApp = {
  initData: string;
  ready(): void;
  expand(): void;
  requestFullscreen?(): void;
  setBackgroundColor?(color: string): void;
  setHeaderColor?(color: string): void;
  setBottomBarColor?(color: string): void;
  isVersionAtLeast?(version: string): boolean;
};

declare global {
  var Telegram: { WebApp?: TelegramWebApp } | undefined;
}

export class ClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 0,
    public readonly retryRoundId?: string,
  ) {
    super(message);
    this.name = "ClientError";
  }
}

export function initializeTelegram(): string {
  const webApp = globalThis.Telegram?.WebApp;
  setTelegramColor("#ffffff");
  webApp?.ready();
  webApp?.expand();
  if (supports(webApp, "8.0")) {
    try {
      webApp?.requestFullscreen?.();
    } catch {
      // Expanded mode remains usable in clients without fullscreen support.
    }
  }
  const initData = webApp?.initData?.trim() ?? "";
  if (!initData) {
    throw new ClientError(
      "TELEGRAM_REQUIRED",
      "Open Memento from its Telegram bot.",
    );
  }
  return initData;
}

export function setTelegramColor(color: string): void {
  const webApp = globalThis.Telegram?.WebApp;
  for (const [minimumVersion, setter] of [
    ["6.1", webApp?.setBackgroundColor],
    ["6.1", webApp?.setHeaderColor],
    ["7.10", webApp?.setBottomBarColor],
  ] as const) {
    if (!supports(webApp, minimumVersion)) continue;
    try {
      setter?.call(webApp, color);
    } catch {
      // Theme setters vary across Telegram client versions.
    }
  }
}

function supports(
  webApp: TelegramWebApp | undefined,
  version: string,
): boolean {
  return !webApp?.isVersionAtLeast || webApp.isVersionAtLeast(version);
}
