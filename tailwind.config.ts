import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Carbinox is a black & white brand with a yellow signature accent.
        ink: "#0B0D11", // near-black, primary
        carbon: "#15171C", // hover/elevated black
        paper: "#F4F5F6", // off-white app surface
        muted: "#6B7280",
        // brand = signature yellow accent (#FFCF0A)
        brand: {
          50: "#FFFBEB",
          100: "#FFF3C4",
          200: "#FFE888",
          300: "#FFDD4D",
          400: "#FFD21F",
          500: "#FFCF0A",
          600: "#E0B200",
          700: "#A88500",
          800: "#705800",
          900: "#4A3A00",
        },
        accent: "#F06624", // secondary accent (orange)
      },
      fontFamily: {
        sans: ["var(--font-konstant)", "var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(11 13 17 / 0.04), 0 1px 3px 0 rgb(11 13 17 / 0.06)",
        "card-hover": "0 6px 16px -4px rgb(11 13 17 / 0.12), 0 2px 6px -2px rgb(11 13 17 / 0.07)",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.55", transform: "scale(0.85)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.3s ease-out both",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
