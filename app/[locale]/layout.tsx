import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { PermissionProvider } from "@/components/providers/PermissionProvider";
import { PWAClient } from "@/components/pwa/PWAClient";
import "./globals.css";

export default async function LocaleLayout({ children, params }: Readonly<{ children: ReactNode; params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as "en" | "ur")) notFound();
  const messages = await getMessages();
  return (
    <html lang={locale} dir={locale === "ur" ? "rtl" : "ltr"}>
      <head>
        <meta name="theme-color" content="#16233F" />
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
