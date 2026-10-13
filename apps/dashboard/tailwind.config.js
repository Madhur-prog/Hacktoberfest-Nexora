/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        mono: [
          "Berkeley Mono",
          "JetBrains Mono",
          "Fira Code",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      colors: {
        // git-cure design tokens
        "gc-bg": "#0D1117",
        "gc-surface": "#161B22",
        "gc-border": "#21262D",
        "gc-text": "#E6EDF3",
        "gc-muted": "#7D8590",
        "gc-accent": "#3FB950",
        "gc-warn": "#D29922",
        "gc-danger": "#F85149",
      },
      animation: {
        blink: "blink 1.1s step-start infinite",
      },
      keyframes: {
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
      },
    },
  },
  plugins: [],
};
