export type LanguageAppCatalog = {
  register(appId: string): Promise<void>;
  find(appId: string): Promise<string | null>;
};

export async function registerLanguageApp(
  catalog: LanguageAppCatalog,
  appId: string,
): Promise<void> {
  await catalog.register(appId);
  const registeredAppId = await catalog.find(appId);
  if (registeredAppId !== appId) {
    throw new Error(`Could not verify ${appId} in memento.language_apps.`);
  }
}
