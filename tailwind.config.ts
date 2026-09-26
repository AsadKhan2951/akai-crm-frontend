import type { Config } from "tailwindcss";
import forms from "@tailwindcss/forms";

/**
 * AKAI design tokens (from the akai-admin-ui kit): warm neutral canvas, ink text, one brand blue.
 * The older token names (primary, secondary, akai.*, slate-*) are mapped onto the same palette,
 * so every existing screen picks up the new look without a rewrite.
 */
const ink = "#15171c";
const neutral = {
  50: "#fafaf8",
  100: "#f1f0ec",
  200: "#e4e3de",
  300: "#d6d5cf",
  400: "#a3a39c",
  500: "#6b717c",
  600: "#5e6470",
  700: "#3a3f48",
  800: "#2b2f37",
  900: ink,
  950: "#0d0e11",
};

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#f5f5f2",
        surface: "#ffffff",
        sunken: "#fafaf8",
        line: "#e4e3de",
        "line-soft": "#eeede8",
        track: "#eeede8",
        ink,
        "ink-2": "#3a3f48",
        subtle: "#6b717c",
        brand: { DEFAULT: "#1f47c6", soft: "#eaf0fd", tint: "#c9d3f2" },
        "brand-soft": "#eaf0fd",
        "brand-tint": "#c9d3f2",
        orange: "#c2560c",
        warn: { DEFAULT: "#a2440b", soft: "#fdf1e7" },
        "warn-soft": "#fdf1e7",
        bad: { DEFAULT: "#b42318", soft: "#fdecea" },
        "bad-soft": "#fdecea",
        good: { DEFAULT: "#0b6b3c", soft: "#e7f5ec" },
        "good-soft": "#e7f5ec",
        sample: { DEFAULT: "#8a4b08", soft: "#fdf3e6" },
        primary: { DEFAULT: ink, foreground: "#FFFFFF" },
        secondary: { DEFAULT: "#f1f0ec", foreground: ink },
        destructive: { DEFAULT: "#b42318", foreground: "#FFFFFF" },
        muted: { DEFAULT: "#5e6470", foreground: "#5e6470", surface: "#f1f0ec" },
        akai: { navy: ink, red: "#b42318", slate: "#5e6470", surface: "#f1f0ec", blue: "#1f47c6" },
        slate: neutral,
        gray: neutral,
      },
      fontFamily: {
        sans: ["var(--font-plex)", "system-ui", "sans-serif"],
        urdu: ["var(--font-naskh)", "var(--font-plex)", "sans-serif"],
        "display-ur": ["var(--font-nastaliq)", "var(--font-naskh)", "serif"],
      },
      borderRadius: { card: "10px" },
    },
  },
  plugins: [forms({ strategy: "class" })],
};

export default config;
