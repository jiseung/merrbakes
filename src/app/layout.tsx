import type { Metadata } from "next";
import {Inter, Patrick_Hand_SC} from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });
const patrick_hand_sc = Patrick_Hand_SC({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-patrick-hand-sc'
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${patrick_hand_sc.className}`}>{children}</body>
    </html>
  );
}
