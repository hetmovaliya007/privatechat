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
        void: "#050508",
        surface: "#0d0d14",
        panel: "#12121c",
        border: "#1e1e2e",
        accent: "#6c63ff",
        "accent-2": "#ff6584",
        muted: "#3d3d5c",
        text: "#e2e2f0",
        "text-dim": "#7878a0",
      },
      fontFamily: {
        sans: ["var(--font-sora)", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      animation: {
        "pulse-slow": "pulse 3s ease-in-out infinite",
        "slide-up": "slideUp 0.3s ease-out",
        "fade-in": "fadeIn 0.2s ease-out",
        "glow": "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        glow: {
          "0%": { boxShadow: "0 0 5px #6c63ff40" },
          "100%": { boxShadow: "0 0 20px #6c63ff80, 0 0 40px #6c63ff20" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};

export default config;
