import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MementoApp } from "@/features/app/memento-app";
import { DEFAULT_APP_ID } from "@/lib/domain/app";
import { APP_IDS, getLanguageFromRoute } from "@/languages/registry";

export const dynamicParams = false;

type LanguagePageProps = {
  params: Promise<{ appId: string }>;
};

export function generateStaticParams() {
  return APP_IDS.filter((appId) => appId !== DEFAULT_APP_ID).map((appId) => ({
    appId,
  }));
}

export async function generateMetadata({
  params,
}: LanguagePageProps): Promise<Metadata> {
  const { appId: routeAppId } = await params;
  const language = getLanguageFromRoute(routeAppId);
  if (!language || language.id === DEFAULT_APP_ID) return {};

  return { title: language.appName };
}

export default async function LanguagePage({
  params,
}: LanguagePageProps) {
  const { appId: routeAppId } = await params;
  const language = getLanguageFromRoute(routeAppId);
  if (!language || language.id === DEFAULT_APP_ID) notFound();

  return <MementoApp appId={language.id} appName={language.appName} />;
}
