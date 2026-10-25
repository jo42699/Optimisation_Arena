import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#020b18",
        panel: "#07172b",
        panel2: "#0b2039",
        line: "#17385e",
        electric: "#3658ff",
        cyan: "#24d9ff",
        "panel-bg": "#061426",
        "panel-raised": "#081a30",
        "input-bg": "#07172b",
        "border-panel": "#17365b",
        "border-active": "#3158ff",
        "border-subtle": "#122944",
        "header-bg": "#041126",
        "accent-blue": "#2878ff",
        "accent-indigo": "#493cff",
      },
      boxShadow: { glow: "0 0 32px rgba(50, 83, 255, .18)", active: "0 0 16px rgb(49 88 255 / 15%)" },
    },
  },
  plugins: [],
};

export default config;
