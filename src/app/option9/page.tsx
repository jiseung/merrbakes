"use client";
import { useState, useEffect } from 'react';
import KofiItem from "@/components/KofiItem";
import MailingListItem from "@/components/MailingListItem";
import { KofiItemType } from "@/app/api/types";

function getSeason(month: number): { name: string; emoji: string; headline: string; desc: string; bg: string } {
  if (month >= 2 && month <= 4) return {
    name: 'spring',
    emoji: '🌸',
    headline: 'spring batch is here',
    desc: 'lemon bars, strawberry cookies, and light-as-air pastries — fresh for the season',
    bg: 'bg-[#fce4ec]',
  };
  if (month >= 5 && month <= 7) return {
    name: 'summer',
    emoji: '☀️',
    headline: 'summer drops are live',
    desc: 'fruity, vibrant, made for warm days — the summer batch just landed in the shop',
    bg: 'bg-[#fff9c4]',
  };
  if (month >= 8 && month <= 10) return {
    name: 'fall',
    emoji: '🍂',
    headline: 'fall flavors have arrived',
    desc: 'pumpkin, cinnamon, caramel — everything cozy and warm to carry you through the season',
    bg: 'bg-[#fff3e0]',
  };
  return {
    name: 'winter',
    emoji: '❄️',
    headline: 'winter batch is here',
    desc: "hot cocoa brownies, peppermint cookies, and holiday classics — the warmest season's drop is ready",
    bg: 'bg-[#e3f2fd]',
  };
}

export default function Option9() {
  const [kofiItems, setKofiItems] = useState<KofiItemType[]>([]);
  const [streamLive] = useState(false);

  const month = new Date().getMonth();
  const season = getSeason(month);
  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  useEffect(() => {
    fetch('/api/kofi', { cache: 'no-store' }).then(r => r.json()).then(d => setKofiItems(d.data ?? []));
  }, []);

  return (
    <main className={`min-h-screen font-hand ${season.bg}`}>
      {/* Season hero */}
      <section className="flex flex-col items-center justify-center py-20 px-8 text-center">
        <p className="text-merrbakes-brown/50 text-sm tracking-[0.4em] uppercase mb-3">{dateStr}</p>
        <div className="text-8xl mb-4">{season.emoji}</div>
        <h1 className="text-6xl text-merrbakes-brown mb-2">merrbakes</h1>
        <h2 className="text-4xl text-merrbakes-brown mb-4">{season.headline}</h2>
        <p className="text-merrbakes-brown/70 italic text-xl max-w-xl leading-relaxed">{season.desc}</p>
        <a
          href="https://ko-fi.com/merrbakes/shop"
          target="_blank"
          rel="noreferrer"
          className="mt-8 bg-merrbakes-brown text-merrbakes-yellow px-10 py-4 rounded-full text-2xl hover:opacity-80 transition shadow-lg"
        >
          shop the {season.name} batch →
        </a>
      </section>

      {/* What's happening right now */}
      <section className="bg-merrbakes-brown text-merrbakes-yellow py-10 px-8">
        <h2 className="text-3xl text-center mb-8 opacity-70 tracking-widest uppercase text-sm">happening right now</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* Stream status */}
          <div className={`rounded-2xl p-6 border-2 ${streamLive ? 'border-merrbakes-green bg-merrbakes-green/20' : 'border-merrbakes-yellow/30 bg-white/5'}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-3 h-3 rounded-full ${streamLive ? 'bg-merrbakes-green animate-pulse' : 'bg-merrbakes-lightgray'}`} />
              <span className="text-xl">{streamLive ? 'live now' : 'stream offline'}</span>
            </div>
            <p className="text-merrbakes-yellow/70 italic text-lg">
              {streamLive ? 'merr is baking right now — tune in!' : 'check twitch for the next stream schedule'}
            </p>
            <a
              href="https://twitch.tv/merrbakes"
              target="_blank"
              rel="noreferrer"
              className="inline-block mt-4 border border-merrbakes-yellow/60 text-merrbakes-yellow px-4 py-2 rounded-lg text-lg hover:bg-merrbakes-yellow/10 transition"
            >
              go to twitch →
            </a>
          </div>

          {/* Current shop status */}
          <div className="rounded-2xl p-6 border-2 border-merrbakes-yellow/30 bg-white/5">
            <p className="text-xl mb-3">shop status</p>
            <p className="text-merrbakes-yellow/70 italic text-lg">
              {kofiItems.filter(i => !i.isSoldOut).length} items available in the {season.name} collection
            </p>
            <a
              href="https://ko-fi.com/merrbakes/shop"
              target="_blank"
              rel="noreferrer"
              className="inline-block mt-4 border border-merrbakes-yellow/60 text-merrbakes-yellow px-4 py-2 rounded-lg text-lg hover:bg-merrbakes-yellow/10 transition"
            >
              visit shop →
            </a>
          </div>

          {/* Community pulse */}
          <div className="rounded-2xl p-6 border-2 border-merrbakes-yellow/30 bg-white/5">
            <p className="text-xl mb-3">community</p>
            <p className="text-merrbakes-yellow/70 italic text-lg">
              the merringue gang is always active — come hang out between streams
            </p>
            <a
              href="https://discord.gg/uRAWAWMQKU"
              target="_blank"
              rel="noreferrer"
              className="inline-block mt-4 border border-merrbakes-yellow/60 text-merrbakes-yellow px-4 py-2 rounded-lg text-lg hover:bg-merrbakes-yellow/10 transition"
            >
              join discord →
            </a>
          </div>
        </div>
      </section>

      {/* Shop items */}
      <section className="p-8">
        <h2 className="text-3xl text-merrbakes-brown text-center mb-2">in the shop right now</h2>
        <p className="text-center text-merrbakes-brown/50 italic mb-6">
          {season.emoji} {season.name} collection
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {kofiItems.map((item, i) => (
            <KofiItem key={i} item={item} />
          ))}
        </div>
      </section>

      <section className="text-center px-8 py-4 text-merrbakes-brown text-xl italic">
        get notified when the season changes
      </section>
      <MailingListItem />
    </main>
  );
}
