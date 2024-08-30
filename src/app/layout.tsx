import type { Metadata } from "next";
import { Patrick_Hand_SC } from "next/font/google";
import { GoogleAnalytics } from '@next/third-parties/google';
import "./globals.css";

const patrick_hand_sc = Patrick_Hand_SC({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-patrick-hand-sc'
});


export const metadata: Metadata = {
  title: 'MerrBakes | Twitch Streamer & Baker | Live Baking & Gaming Streams',
  description: `Welcome to MerrBakes! Join Merr as she streams baking and gaming adventures on Twitch. 
    Follow for live recipes, fun chats, and a welcoming community.`,
  keywords: [
    'MerrBakes', 'Twitch streamer', 'live baking',
    'baking streams', 'baking recipes', 'gaming',
    'Twitch baking', 'live stream community', 'baking and gaming',
    'Twitch baking streamer', 'food content creator', 'live chat',
    'Twitch recipes', 'baking livestream', 'friendly streamer'
  ]
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${patrick_hand_sc.className}`}>{children}</body>
      <GoogleAnalytics gaId="G-8XRZYXBJ6V" />
    </html>
  );
}
