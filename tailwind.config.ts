import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#ECE6D6",
        paperBg: "#E3DCC8",
        ink: "#241F18",
        marian: "#1F3B5C",
        marianLight: "#274a70",
        gold: "#B08D3E",
        rust: "#8C4A3D",
        muted: "#5b5340",
      },
      fontFamily: {
        display: ["Lora", "serif"],
        body: ["Inter", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
