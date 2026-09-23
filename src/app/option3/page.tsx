"use client";
import Script from 'next/script';
import { useState, useEffect, useRef } from 'react';
import KofiItem from "@/components/KofiItem";
import { KofiItemType } from "@/app/api/types";
import { reviews } from "@/content/reviews";

export default function Option3() {
  const [kofiItems, setKofiItems] = useState<KofiItemType[]>([]);
  const [email, setEmail] = useState('');
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    fetch('/api/kofi', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setKofiItems(d.data ?? []));
  }, []);

  useEffect(() => { setJoined(false); }, [email]);

  async function joinList() {
    const res = await fetch('/api/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (data.success) setJoined(true);
  }

  const marqueeReviews = [...reviews, ...reviews];

  return (
    <>
      <Script
        src="https://embed.twitch.tv/embed/v1.js"
        onLoad={() => {
          if (window.Twitch) {
            new window.Twitch.Embed("twitch-embed-opt3", {
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
      <main className="min-h-screen bg-merrbakes-pink font-hand overflow-x-hidden">
        <header className="text-center pt-12 pb-4 text-merrbakes-brown">
          <h1 className="text-6xl">merrbakes</h1>
          <p className="text-xl mt-1 italic">you're not just buying baked goods — you're joining the merringue gang</p>
        </header>

        {/* Marquee */}
        <div className="overflow-hidden py-4 bg-merrbakes-yellow border-y-2 border-merrbakes-brown my-6">
          <div
            className="flex gap-12 whitespace-nowrap"
            style={{ animation: 'marquee 40s linear infinite' }}
          >
            {marqueeReviews.map((r, i) => (
              <span key={i} className="text-merrbakes-brown text-xl shrink-0">
                ✦ "{r.content.slice(0, 80).trim()}..." — {r.author}
              </span>
            ))}
          </div>
        </div>
        <style>{`
          @keyframes marquee {
            from { transform: translateX(0); }
            to { transform: translateX(-50%); }
          }
        `}</style>

        {/* Split: Discord + Twitch */}
        <section className="flex flex-col lg:flex-row gap-6 p-8">
          <div className="flex-1 bg-[#5865f2] rounded-2xl p-8 text-white flex flex-col items-center justify-center gap-4 min-h-80">
            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="w-20 h-20" viewBox="0 0 16 16">
              <path d="M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019q.463-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.2 13.2 0 0 0 4.001-2.02.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612"/>
            </svg>
            <h2 className="text-3xl text-center">join the merringue gang</h2>
            <p className="text-center text-white/80">a warm community of bakers, gamers, and good people</p>
            <a
              href="https://discord.gg/uRAWAWMQKU"
              target="_blank"
              rel="noreferrer"
              className="mt-2 bg-white text-[#5865f2] px-8 py-3 rounded-full text-xl font-bold hover:bg-white/90 transition"
            >
              join discord →
            </a>
          </div>

          <div className="flex-1 aspect-video rounded-2xl overflow-hidden shadow-xl">
            <div id="twitch-embed-opt3" className="w-full h-full" />
          </div>
        </section>

        {/* Shop section */}
        <section className="px-8 pb-8">
          <h2 className="text-3xl text-merrbakes-brown text-center mb-6">what the gang is ordering</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {kofiItems.map((item, i) => (
              <KofiItem key={i} item={item} />
            ))}
          </div>
        </section>

        {/* Membership card mailing list */}
        <section className="p-8">
          <div className="max-w-lg mx-auto bg-merrbakes-yellow border-4 border-merrbakes-brown rounded-2xl p-8 shadow-xl">
            <p className="text-xs tracking-widest text-merrbakes-brown/60 uppercase mb-1 text-center">merringue gang</p>
            <h2 className="text-3xl text-merrbakes-brown text-center mb-1">membership card</h2>
            <p className="text-center text-merrbakes-brown/70 text-sm mb-6">fill out your info to get early access to drops & updates</p>
            <div className="border-b border-merrbakes-brown mb-3 pb-1">
              <input
                type="text"
                placeholder="your email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="bg-transparent w-full text-merrbakes-brown placeholder-merrbakes-brown/40 text-xl outline-none text-center"
              />
            </div>
            <button
              onClick={joinList}
              className="w-full bg-merrbakes-brown text-merrbakes-yellow py-3 rounded-xl text-xl mt-3 hover:opacity-80 transition"
            >
              {joined ? 'welcome to the gang! ✦' : 'claim your membership'}
            </button>
          </div>
        </section>
      </main>
    </>
  );
}
