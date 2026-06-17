import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        /* 오팔/라벤더(페리윙클) — 브랜드 프라이머리 */
        primary: {
          50: "#f4f4fd",
          100: "#e9eafb",
          200: "#d6d8f6",
          300: "#bcc0ef",
          400: "#9aa6f2",
          500: "#7e8ce8",
          600: "#6470d6",
          700: "#515cc0",
          800: "#424aa0",
          900: "#393f82",
        },
        /* 보조 — 파스텔 핑크/아쿠아/샴페인 (오팔 글로우용) */
        opal: {
          pink: "#f3c0dd",
          lilac: "#c9b8f3",
          aqua: "#bfe3e6",
          gold: "#f6e3b8",
        },
      },
      borderRadius: {
        xl2: "1.75rem",
      },
      boxShadow: {
        glass: "0 14px 44px rgba(140, 130, 170, 0.12)",
        "glass-lg": "0 28px 84px rgba(140, 130, 170, 0.18)",
        glow: "0 0 0 4px rgba(154, 166, 242, 0.18)",
      },
    },
  },
  plugins: [],
};
export default config;
