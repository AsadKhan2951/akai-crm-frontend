import type { MetadataRoute } from "next";

export default async function manifest({ params }: { params: Promise<{ locale: string }> }): Promise<MetadataRoute.Manifest> {
  const { locale } = await params;
  const safeLocale = locale === "ur" ? "ur" : "en";
  return {
    name: safeLocale === "ur" ? "AKAI CRM — Sales" : "AKAI CRM — Sales",
    short_name: "AKAI Sales",
    description: safeLocale === "ur" ? "AKAI Sales portal" : "AKAI Sales portal",
    start_url: `/${safeLocale}/sales`,
    scope: `/${safeLocale}/sales/`,
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
