import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          red: "#D72638",
          "red-dark": "#A81C28",
          "red-light": "#F24455",
          black: "#0D0D0D",
          "gray-dark": "#1A1A1A",
          "gray-mid": "#2A2A2A",
          "gray-light": "#3D3D3D",
          "text-muted": "#9CA3AF",
        },
      },
      fontFamily: {
        sans: ["var(--font-manrope)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
