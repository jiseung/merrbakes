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
        'merrbakes-pink': '#F4D9E1',
        'merrbakes-brown': '#765C4B',
        'merrbakes-gray': '#424651'
      },
      fontFamily: {
        hand: ['var(--font-patrick-hand-sc)'],
      },
    },
  },
  plugins: [],
};
export default config;
