"use client";
import Script from 'next/script';
import { useState, useEffect } from 'react';
import KofiItem from "@/components/KofiItem";
import MailingListItem from "@/components/MailingListItem";
import { KofiItemType } from "@/app/api/types";

export default function Option1() {
  const [kofiItems, setKofiItems] = useState<KofiItemType[]>([]);

  useEffect(() => {
    fetch('/api/kofi', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setKofiItems(d.data ?? []));
  }, []);

  const hour = new Date().getHours();
  const isLive = hour >= 17 && hour < 24;

  return (
    <>
      <Script
        src="https://embed.twitch.tv/embed/v1.js"
        onLoad={() => {
          if (window.Twitch) {
            new window.Twitch.Embed("twitch-embed-opt1", {
              width: "100%",
              height: "100%",
              channel: "merrbakes",
              layout: "video",
              theme: "light",
              muted: true,
            });
          }
        }}
      />
      <main className="min-h-screen bg-merrbakes-pink font-hand">
        <section className="relative w-full h-screen">
          <div id="twitch-embed-opt1" className="w-full h-full" />
          <div
            className={`absolute top-6 left-6 z-10 rotate-[-6deg] px-6 py-2 border-4 border-double
              text-3xl shadow-xl select-none ${
              isLive
                ? 'bg-merrbakes-green border-merrbakes-brown text-merrbakes-brown'
                : 'bg-merrbakes-gray border-white text-white'
            }`}
          >
            {isLive ? '✦ OPEN ✦' : '✦ CLOSED ✦'}
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-merrbakes-brown/75 text-merrbakes-yellow text-center py-5 text-5xl tracking-wide z-10">
            merrbakes
          </div>
        </section>

        <section className="bg-[#2a2a2a] text-[#f5f0dc] p-10">
          <h2 className="text-center text-4xl mb-1 text-merrbakes-yellow tracking-widest">
            — today's specials —
          </h2>
          <p className="text-center text-merrbakes-lightgray mb-8 text-lg">fresh from the ko-fi shop</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {kofiItems.map((item, i) => (
              <KofiItem key={i} item={item} />
            ))}
          </div>
        </section>

        <MailingListItem />

        <footer className="bg-white font-mono text-merrbakes-brown text-center py-10 px-4 border-t-4 border-dashed border-merrbakes-brown">
          <p className="text-sm mb-1 tracking-widest">* * * * * * * * * * * * * * * * * * *</p>
          <p className="text-xl mb-4 tracking-[0.4em]">MERRBAKES</p>
          <div className="flex flex-col items-center gap-1 text-sm">
            {([
              ['twitch  ', 'twitch.tv/merrbakes', 'https://twitch.tv/merrbakes'],
              ['ko-fi   ', 'ko-fi.com/merrbakes', 'https://ko-fi.com/merrbakes'],
              ['discord ', 'discord.gg/uRAWAWMQKU', 'https://discord.gg/uRAWAWMQKU'],
              ['insta   ', '@merrbakes', 'https://www.instagram.com/MerrBakes'],
              ['twitter ', '@merrbakes', 'https://twitter.com/MerrBakes'],
              ['tiktok  ', '@merrbakes', 'https://www.tiktok.com/@merrbakes'],
            ] as [string, string, string][]).map(([label, handle, href]) => (
              <a key={label} href={href} target="_blank" rel="noreferrer" className="hover:underline">
                {label}......{handle}
              </a>
            ))}
          </div>
          <p className="mt-4 text-sm tracking-widest">* * * * * * * * * * * * * * * * * * *</p>
          <p className="mt-2 text-xs">thank you for visiting · come back soon~</p>
        </footer>
      </main>
    </>
  );
}
