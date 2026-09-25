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
        'merrbakes-berry': '#E15C7C',
        'merrbakes-berry-ink': '#C6425F',
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
      // one-off yellow flash that fades out, for a field that appears after
      // something else is filled in (e.g. the cart's referral field)
      keyframes: {
        highlight: {
          '0%, 30%': { backgroundColor: '#FFE99F' },
          '100%': { backgroundColor: 'transparent' },
        },
      },
      animation: {
        highlight: 'highlight 2.5s ease-out forwards',
      },
    },
  },
  plugins: [],
};
export default config;
