export type TelegramWebApp = {
  initData: string;
  ready(): void;
  expand(): void;
  enableVerticalSwipes?(): void;
  requestFullscreen?(): void;
  setBackgroundColor?(color: string): void;
  setHeaderColor?(color: string): void;
  setBottomBarColor?(color: string): void;
  isVersionAtLeast?(version: string): boolean;
};

declare global {
  var Telegram: { WebApp?: TelegramWebApp } | undefined;
}

export const APP_BACKGROUND = "#ffffff";
export const DIALOG_BACKDROP_SOLID = "#ababb2";

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

export function initializeTelegram(appName: string): string {
  const webApp = globalThis.Telegram?.WebApp;
  setTelegramColor(APP_BACKGROUND);
  webApp?.ready();
  webApp?.expand();
  invokeIfSupported(webApp, "7.7", webApp?.enableVerticalSwipes);
  invokeIfSupported(webApp, "8.0", webApp?.requestFullscreen);
  const initData = webApp?.initData?.trim() ?? "";
  if (!initData) {
    throw new ClientError(
      "TELEGRAM_REQUIRED",
      `Open ${appName} from its Telegram bot.`,
    );
  }
  return initData;
}

export function setTelegramColor(color: string): void {
  const themeColor = globalThis.document?.querySelector<HTMLMetaElement>(
    'meta[name="theme-color"]',
  );
  themeColor?.setAttribute("content", color);

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

function invokeIfSupported(
  webApp: TelegramWebApp | undefined,
  version: string,
  action: (() => void) | undefined,
): void {
  if (!supports(webApp, version)) return;
  try {
    action?.call(webApp);
  } catch {
    // Older and partially implemented Telegram clients remain usable.
  }
}
