export const APP_IDS = ["en", "cz"] as const;

export type AppId = (typeof APP_IDS)[number];

export const DEFAULT_APP_ID: AppId = "en";
export const APP_HEADER = "x-memento-app";

export function isAppId(value: string): value is AppId {
  return (APP_IDS as readonly string[]).includes(value);
}

export function appPath(appId: AppId): string {
  return appId === DEFAULT_APP_ID ? "/" : `/${appId}`;
}
