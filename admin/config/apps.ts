export const ADMIN_APPS = {
  en: { name: "Memento", speakingEnabled: true },
  cz: { name: "Pomněnka", speakingEnabled: false },
} as const;

export type AdminAppId = keyof typeof ADMIN_APPS;

export function getAdminApp(appId: string) {
  return Object.prototype.hasOwnProperty.call(ADMIN_APPS, appId)
    ? ADMIN_APPS[appId as AdminAppId]
    : { name: appId.toUpperCase(), speakingEnabled: false };
}

export function isAdminAppId(value: string): value is AdminAppId {
  return Object.prototype.hasOwnProperty.call(ADMIN_APPS, value);
}
