import type { MetadataRoute } from "next";

export default async function manifest({ params }: { params: Promise<{ locale: string }> }): Promise<MetadataRoute.Manifest> {
  const { locale } = await params;
  const safeLocale = locale === "ur" ? "ur" : "en";
  return {
    name: safeLocale === "ur" ? "AKAI CRM — Vendor" : "AKAI CRM — Vendor",
    short_name: "AKAI Vendor",
    description: safeLocale === "ur" ? "AKAI Vendor portal" : "AKAI Vendor portal",
    start_url: `/${safeLocale}/vendor`,
    scope: `/${safeLocale}/vendor/`,
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#15171c",
    lang: safeLocale,
    dir: safeLocale === "ur" ? "rtl" : "ltr",
    icons: [
      { src: "/icons/akai-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/akai-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/akai-icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
