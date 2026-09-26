"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";

/** Points the page's web-app manifest at the right portal (vendor app installs as its own app). */
export function ManifestSwitcher({ portal }: { portal: "admin" | "sales" | "vendor" }) {
  const locale = useLocale();
  useEffect(() => {
    const manifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (manifest) manifest.href = `/${locale}${portal === "vendor" ? "/vendor" : ""}/manifest.webmanifest`;
  }, [locale, portal]);
  return null;
}
