import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { ENGLISH_LANGUAGE } from "@/app/_languages/en";
import "./globals.css";

export const metadata: Metadata = {
  title: ENGLISH_LANGUAGE.appName,
  description: "Turn passive vocabulary into words you recognize with confidence.",
};

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
