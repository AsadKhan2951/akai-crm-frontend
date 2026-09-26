import type { ReactNode } from "react";
import type { Viewport } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { PermissionProvider } from "@/components/providers/PermissionProvider";
import { PWAClient } from "@/components/pwa/PWAClient";
import { fontVariables } from "@/lib/fonts";
import "./globals.css";

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#15171c" };

export default async function LocaleLayout({ children, params }: Readonly<{ children: ReactNode; params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as "en" | "ur")) notFound();
  const messages = await getMessages();
  return (
    <html lang={locale} dir={locale === "ur" ? "rtl" : "ltr"} className={fontVariables}>
      <head>
        <link rel="manifest" href={`/${locale}/manifest.webmanifest`} />
      </head>
      <body>
        <NextIntlClientProvider messages={messages}>
          <PermissionProvider><PWAClient />{children}</PermissionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
