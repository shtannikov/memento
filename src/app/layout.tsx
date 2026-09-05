import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import Script from "next/script";
import { ENGLISH_LANGUAGE } from "@/app/_languages/en";
import {
  POMNENKA_SITE,
  POMNENKA_SITE_HEADER,
  titleForSite,
} from "@/app/site-routing";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const site = requestHeaders.get(POMNENKA_SITE_HEADER);

  return {
    title: titleForSite(ENGLISH_LANGUAGE.appName, site),
    description:
      site === POMNENKA_SITE
        ? "Add Czech words and phrases, practice them with quick quizzes, and track your progress."
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
