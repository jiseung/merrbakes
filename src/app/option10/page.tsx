"use client";
import Script from 'next/script';
import { useState, useEffect } from 'react';
import KofiItem from "@/components/KofiItem";
import { KofiItemType } from "@/app/api/types";
import { reviews } from "@/content/reviews";

type Path = null | 'watch' | 'order' | 'join';

const paths = [
  {
    key: 'watch' as Path,
    emoji: '📺',
    label: 'watch',
    sublabel: 'tune into the stream',
    bg: 'bg-[#9146ff]',
    hoverBg: 'hover:bg-[#7d35ee]',
    text: 'text-white',
  },
  {
    key: 'order' as Path,
    emoji: '🍪',
    label: 'order',
    sublabel: 'shop baked goods',
    bg: 'bg-merrbakes-yellow',
    hoverBg: 'hover:bg-merrbakes-yellow/80',
    text: 'text-merrbakes-brown',
  },
  {
    key: 'join' as Path,
    emoji: '💬',
    label: 'join',
    sublabel: 'hang in the community',
    bg: 'bg-[#5865f2]',
    hoverBg: 'hover:bg-[#4752c4]',
    text: 'text-white',
  },
];

export default function Option10() {
  const [activePath, setActivePath] = useState<Path>(null);
  const [kofiItems, setKofiItems] = useState<KofiItemType[]>([]);
  const [email, setEmail] = useState('');
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    if (activePath === 'order') {
      fetch('/api/kofi', { cache: 'no-store' }).then(r => r.json()).then(d => setKofiItems(d.data ?? []));
    }
    if (activePath === 'watch') {
      setTimeout(() => {
        if (window.Twitch) {
          new window.Twitch.Embed("twitch-embed-opt10", {
            width: "100%",
            height: "100%",
            channel: "merrbakes",
            layout: "video",
            theme: "light",
            muted: true,
          });
        }
      }, 300);
    }
  }, [activePath]);

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

  return (
    <>
      <Script src="https://embed.twitch.tv/embed/v1.js" />
      <main className="min-h-screen bg-merrbakes-pink font-hand flex flex-col">
        {/* Header — always visible */}
        <header className="text-center pt-12 pb-6 px-8">
          <h1 className="text-7xl text-merrbakes-brown">merrbakes</h1>
          <p className="text-merrbakes-brown/60 italic text-xl mt-2">
            {activePath === null
              ? "whether you're here to watch, eat, or hang — you're in the right place"
              : activePath === 'watch'
              ? "watch merr bake live on twitch"
              : activePath === 'order'
              ? "handmade baked goods, shipped with love"
              : "come hang with the merringue gang"}
          </p>
        </header>

        {/* Path selector */}
        <nav className="grid grid-cols-3 gap-0 border-y-4 border-merrbakes-brown">
          {paths.map(({ key, emoji, label, sublabel, bg, hoverBg, text }) => (
            <button
              key={key!}
              onClick={() => setActivePath(activePath === key ? null : key)}
              className={`flex flex-col items-center justify-center py-8 gap-2 transition border-r last:border-r-0 border-merrbakes-brown
                ${activePath === key ? bg + ' ' + text : 'bg-white/30 text-merrbakes-brown ' + hoverBg}
                ${activePath !== null && activePath !== key ? 'opacity-40' : ''}
              `}
            >
              <span className="text-5xl">{emoji}</span>
              <span className="text-3xl">{label}</span>
              <span className={`text-sm ${activePath === key ? 'opacity-70' : 'text-merrbakes-brown/50'}`}>{sublabel}</span>
            </button>
          ))}
        </nav>

        {/* Revealed sections */}
        <div className="flex-1">
          {activePath === null && (
            <div className="flex flex-col items-center justify-center py-20 text-center text-merrbakes-brown">
              <p className="text-3xl mb-2">pick a path above to get started</p>
              <p className="text-xl text-merrbakes-brown/50 italic">each one leads somewhere different</p>
            </div>
          )}

          {activePath === 'watch' && (
            <div className="flex flex-col">
              <div className="w-full aspect-video">
                <div id="twitch-embed-opt10" className="w-full h-full" />
              </div>
              <div className="p-8 text-center text-merrbakes-brown">
                <p className="text-2xl italic mb-4">merr streams baking and gaming — tune in and say hi</p>
                <a
                  href="https://twitch.tv/merrbakes"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block bg-[#9146ff] text-white px-8 py-3 rounded-lg text-xl hover:opacity-80 transition"
                >
                  open in twitch →
                </a>
              </div>
            </div>
          )}

          {activePath === 'order' && (
            <div className="p-8">
              <h2 className="text-3xl text-merrbakes-brown text-center mb-2">the shop</h2>
              <p className="text-center text-merrbakes-brown/60 italic mb-8 text-xl">handmade in small batches · shipped carefully</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {kofiItems.map((item, i) => (
                  <KofiItem key={i} item={item} />
                ))}
              </div>
              <div className="mt-8 text-center">
                <p className="text-merrbakes-brown italic text-xl mb-4">get notified when new batches drop</p>
                <div className="flex flex-col sm:flex-row gap-3 items-center justify-center max-w-md mx-auto">
                  <input
                    type="text"
                    placeholder="your email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="flex-1 border-2 border-merrbakes-brown rounded-lg px-4 py-2 text-xl text-merrbakes-brown bg-white/80 placeholder-merrbakes-brown/40 outline-none w-full"
                  />
                  <button
                    onClick={joinList}
                    className="bg-merrbakes-brown text-merrbakes-yellow px-6 py-2 rounded-lg text-xl hover:opacity-80 transition whitespace-nowrap"
                  >
                    {joined ? "you're in! ✦" : 'notify me'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activePath === 'join' && (
            <div className="p-8 flex flex-col items-center gap-8">
              <div className="max-w-2xl w-full">
                <div className="bg-[#5865f2] rounded-2xl p-8 text-white text-center mb-6">
                  <h2 className="text-4xl mb-3">the merringue gang</h2>
                  <p className="text-white/70 text-xl italic mb-6">
                    a warm, welcoming community of bakers, gamers, and good people — join us
                  </p>
                  <a
                    href="https://discord.gg/uRAWAWMQKU"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block bg-white text-[#5865f2] px-10 py-3 rounded-full text-2xl font-bold hover:bg-white/90 transition"
                  >
                    join the discord →
                  </a>
                </div>

                <h3 className="text-2xl text-merrbakes-brown mb-4 text-center">what they're saying</h3>
                <div className="flex flex-col gap-4">
                  {reviews.slice(0, 4).map((r, i) => (
                    <div key={i} className="bg-white/70 border border-merrbakes-brown/20 rounded-xl p-5">
                      <p className="text-merrbakes-brown italic text-lg">"{r.content}"</p>
                      <p className="text-merrbakes-brown/50 text-sm mt-2">— {r.author}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
