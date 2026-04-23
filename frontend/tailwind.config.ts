import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "../packages/ui/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        orbit: {
          bg: "#050a15",
          cyan: "#22d3ee",
          violet: "#a855f7",
          gold: "#fbbf24",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "hero-glow":
          "radial-gradient(ellipse at top, rgba(56,189,248,0.15), transparent 55%), radial-gradient(ellipse at bottom right, rgba(168,85,247,0.12), transparent 45%)",
      },
      animation: {
        float: "float 6s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
