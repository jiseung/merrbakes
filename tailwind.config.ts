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
        'merrbakes-gray': '#424651',
        'merrbakes-green': '#67DFB9',
        'merrbakes-yellow': '#FFE99F',
        'merrbakes-blue': '#78D5D7',
        'merrbakes-lightgray': '#7A7A7A',
        'twitch-purple': '#9146ff'
      },
      fontFamily: {
        hand: ['var(--font-patrick-hand-sc)'],
        balsamiq: ['var(--font-balsamiq-sans)']
      },
    },
  },
  plugins: [],
};
export default config;
