import localFont from "next/font/local";

// Self-hosted (SIL Open Font License) so builds never depend on reaching Google Fonts.
// Latin UI font
export const plex = localFont({
  src: [
    { path: "./ibm-plex-sans-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./ibm-plex-sans-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./ibm-plex-sans-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./ibm-plex-sans-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-plex",
  display: "swap",
  fallback: ["system-ui", "Segoe UI", "Arial", "sans-serif"],
});

// Urdu body/UI font: Naskh stays legible in dense tables and renders much faster than Nastaliq
export const naskh = localFont({
  src: [
    { path: "./noto-naskh-arabic-arabic-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./noto-naskh-arabic-arabic-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./noto-naskh-arabic-arabic-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./noto-naskh-arabic-arabic-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-naskh",
  display: "swap",
  preload: false,
  fallback: ["Noto Naskh Arabic", "Segoe UI", "Tahoma", "sans-serif"],
});

// Urdu display font: page titles only
export const nastaliq = localFont({
  src: [
    { path: "./noto-nastaliq-urdu-arabic-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./noto-nastaliq-urdu-arabic-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-nastaliq",
  display: "swap",
  preload: false,
  fallback: ["Noto Nastaliq Urdu", "serif"],
});

export const fontVariables = `${plex.variable} ${naskh.variable} ${nastaliq.variable}`;
