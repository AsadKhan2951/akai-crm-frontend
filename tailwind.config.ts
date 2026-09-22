import type { Config } from "tailwindcss";
import forms from "@tailwindcss/forms";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#16233F", foreground: "#FFFFFF" },
        secondary: { DEFAULT: "#F1F5F9", foreground: "#16233F" },
        destructive: { DEFAULT: "#D6202C", foreground: "#FFFFFF" },
        muted: { DEFAULT: "#F1F5F9", foreground: "#64748B" },
        akai: { navy: "#16233F", red: "#D6202C", slate: "#64748B", surface: "#F1F5F9" },
      },
      fontFamily: {
        urdu: ['"Noto Nastaliq Urdu"', '"Noto Sans Arabic"', "sans-serif"],
      },
    },
  },
  plugins: [forms],
};

export default config;
