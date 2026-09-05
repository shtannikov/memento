import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import Script from "next/script";
import { ENGLISH_LANGUAGE } from "@/app/_languages/en";
import {
  getSiteLanguageFromHeader,
  SITE_APP_HEADER,
} from "@/app/site-routing";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const siteLanguage = getSiteLanguageFromHeader(
    requestHeaders.get(SITE_APP_HEADER),
  );

  return {
    title: siteLanguage?.appName ?? ENGLISH_LANGUAGE.appName,
    description: siteLanguage
      ? `Add ${siteLanguage.targetLanguage} words and phrases, practice them with quick quizzes, and track your progress.`
      : "Turn passive vocabulary into words you recognize with confidence.",
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
        {children}
      </body>
    </html>
  );
}
