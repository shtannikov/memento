export type AdminTelegramWebApp = {
  initData: string;
  ready(): void;
  expand(): void;
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
  const initData = webApp?.initData?.trim() ?? "";
  if (!initData) throw new Error("Open Memento Admin from its Telegram bot.");
  return initData;
}
