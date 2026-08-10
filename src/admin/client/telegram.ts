export type AdminTelegramWebApp = {
  initData: string;
  ready(): void;
  expand(): void;
  requestFullscreen?(): void;
  isVersionAtLeast?(version: string): boolean;
  setBackgroundColor?(color: string): void;
  setHeaderColor?(color: string): void;
};

export function initializeAdminTelegram(): string {
  const telegramGlobal = globalThis as unknown as {
    Telegram?: { WebApp?: AdminTelegramWebApp };
  };
  const webApp = telegramGlobal.Telegram?.WebApp;
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
  const initData = webApp?.initData?.trim() ?? "";
  if (!initData) throw new Error("Open Memento Admin from its Telegram bot.");
  return initData;
}
