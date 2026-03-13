import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Background tiers
        bg: {
          primary: "var(--bg-primary)",
          secondary: "var(--bg-secondary)",
          tertiary: "var(--bg-tertiary)",
          inverse: "var(--bg-inverse)",
        },
        // Text
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          tertiary: "var(--text-tertiary)",
          inverse: "var(--text-inverse)",
        },
        // Accents
        accent: {
          primary: "var(--accent-primary)",
          hover: "var(--accent-hover)",
          secondary: "var(--accent-secondary)",
          tertiary: "var(--accent-tertiary)",
          muted: "var(--accent-muted)",
        },
        // Semantic
        fork: {
          indicator: "var(--fork-indicator)",
          active: "var(--active-branch)",
          parent: "var(--parent-branch)",
        },
        // Depth colors for nested forks
        depth: {
          1: "var(--depth-1)",
          2: "var(--depth-2)",
          3: "var(--depth-3)",
          4: "var(--depth-4)",
        },
        // Code
        code: {
          bg: "var(--code-bg)",
          text: "var(--code-text)",
        },
      },
      fontFamily: {
        display: ['"Newsreader"', "Georgia", "serif"],
        body: ['"Source Sans 3"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', '"Fira Code"', "monospace"],
      },
      boxShadow: {
        warm: "0 2px 12px rgba(139, 111, 71, 0.08)",
        "warm-lg": "0 4px 24px rgba(139, 111, 71, 0.12)",
        "warm-xl": "0 8px 40px rgba(139, 111, 71, 0.16)",
      },
      borderRadius: {
        message: "1.25rem",
      },
      spacing: {
        sidebar: "280px",
      },
      transitionDuration: {
        DEFAULT: "150ms",
      },
      transitionTimingFunction: {
        DEFAULT: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      keyframes: {
        "fork-split": {
          "0%": { transform: "scale(1) translateY(0)", opacity: "1" },
          "50%": { transform: "scale(0.98) translateY(-2px)", opacity: "0.7" },
          "100%": { transform: "scale(1) translateY(0)", opacity: "1" },
        },
        "slide-in-right": {
          "0%": { transform: "translateX(100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "fade-in-up": {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        "fork-split": "fork-split 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        "slide-in-right": "slide-in-right 0.2s ease-out",
        "fade-in-up": "fade-in-up 0.3s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
