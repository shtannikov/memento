export type AdminTelegramWebApp = {
  initData: string;
  ready(): void;
  expand(): void;
  requestFullscreen?(): void;
  isVersionAtLeast?(version: string): boolean;
  setBackgroundColor?(color: string): void;
  setHeaderColor?(color: string): void;
};

export function initializeAdminTelegram(): string | null {
  const telegramGlobal = globalThis as unknown as {
    Telegram?: { WebApp?: AdminTelegramWebApp };
  };
  const webApp = telegramGlobal.Telegram?.WebApp;
  const initData = webApp?.initData?.trim() ?? "";
  if (!initData) return null;

  webApp?.setBackgroundColor?.("#f4f4f5");
  webApp?.setHeaderColor?.("#f4f4f5");
  webApp?.ready();
  webApp?.expand();
  if (!webApp?.isVersionAtLeast || webApp.isVersionAtLeast("8.0")) {
    try {
      webApp?.requestFullscreen?.();
    } catch {
      // Expanded mode remains usable when a client rejects fullscreen.
    }
  }
  return initData;
}
