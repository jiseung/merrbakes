"use client";
import { useState, useEffect } from 'react';
import KofiItem from "@/components/KofiItem";
import { KofiItemType, InstagramItemType } from "@/app/api/types";
import { reviews } from "@/content/reviews";
import InstagramItem from "@/components/InstagramItem";

// Hero colors ported verbatim from artifact 193b5881 (its --cocoa/--cocoa-2/--berry/--berry-ink/--line/--line-2 tokens),
// scoped to just this section rather than merged into the shared merrbakes-* Tailwind palette.
const HERO = {
  cocoa: '#6E5344',
  cocoa2: '#8C7264',
  berry: '#E15C7C',
  berryInk: '#C6425F',
  gold: '#FFE99F',
  grape: '#9146FF',
  mint: '#3E9E86',
  card: '#FFFFFF',
  line: '#EAD3DA',
  line2: '#DCC0B5',
  shadowSm: '0 1px 2px rgba(58,36,32,.06), 0 6px 16px -10px rgba(58,36,32,.24)',
  shadowMd: '0 2px 6px rgba(58,36,32,.08), 0 18px 40px -20px rgba(58,36,32,.30)',
};

const TREATS = [
  { emoji: '🍫', name: 'Dubai Chewy Cookies', price: 'from $30', plate: 'radial-gradient(circle at 32% 28%, #c98a5e, transparent 55%), linear-gradient(140deg, #6b4429, #4a2c17)', rotate: '-2deg', mt: '' },
  { emoji: '🧁', name: 'Meowdeleines', price: 'from $18', plate: 'radial-gradient(circle at 30% 30%, #ffd9e2, transparent 55%), linear-gradient(140deg, #f5a9c0, #e06a92)', rotate: '1.5deg', mt: 'mt-6' },
  { emoji: '🍡', name: 'Butter Tteok', price: 'from $14', plate: 'radial-gradient(circle at 30% 30%, #d7ecc4, transparent 55%), linear-gradient(140deg, #9cc47b, #5f9e6a)', rotate: '1deg', mt: '' },
  { emoji: '🐟', name: 'Korean Fish Bread', price: 'from $12', plate: 'radial-gradient(circle at 30% 30%, #ffe9b0, transparent 55%), linear-gradient(140deg, #f0c869, #d99a3c)', rotate: '-1.5deg', mt: '-mt-1.5' },
];

export default function Option4() {
  const [kofiItems, setKofiItems] = useState<KofiItemType[]>([]);
  const [instaPosts, setInstaPosts] = useState<InstagramItemType[]>([]);
  const [email, setEmail] = useState('');
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    fetch('/api/kofi', { cache: 'no-store' }).then(r => r.json()).then(d => setKofiItems(d.data ?? []));
    fetch('/api/instagram', { cache: 'no-store' }).then(r => r.json()).then(d => setInstaPosts(d.posts ?? []));
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

  return (
    <main className="min-h-screen bg-merrbakes-pink font-hand">
      {/* Masthead */}
      <header className="border-b-4 border-merrbakes-brown text-center px-8 pt-10 pb-6">
        <h1 className="text-8xl text-merrbakes-brown leading-none">merrbakes</h1>
        <div className="flex justify-center gap-8 mt-4 text-merrbakes-brown text-sm border-t border-merrbakes-brown/30 pt-4">
          <a href="https://ko-fi.com/merrbakes/shop" className="hover:underline" target="_blank" rel="noreferrer">shop</a>
          <a href="#subscribe" className="hover:underline">join the club</a>
          <a href="#blog" className="hover:underline">blog</a>
          <a href="https://twitch.tv/merrbakes" className="hover:underline" target="_blank" rel="noreferrer">watch live</a>
        </div>
      </header>

      {/* Hero — direct port of artifact 193b5881's hero (colors, effects, collage), minus its own header/nav */}
      <section className="border-b-4 border-merrbakes-brown p-10">
        <div className="grid grid-cols-1 md:grid-cols-[1.05fr_0.95fr] gap-8 md:gap-11 items-center">
          <div>
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="rotate-[-2deg] inline-block font-extrabold text-[.72rem] tracking-wide px-3 py-1.5 rounded-full" style={{ background: HERO.gold, color: '#3A2420' }}>
                🔥 fresh weekly drops
              </span>
              <span className="rotate-[1.5deg] inline-block font-extrabold text-[.72rem] tracking-wide px-3 py-1.5 rounded-full text-white" style={{ background: HERO.grape }}>
                baked live on Twitch
              </span>
              <span className="rotate-[-1deg] inline-block font-extrabold text-[.72rem] tracking-wide px-3 py-1.5 rounded-full text-white" style={{ background: HERO.mint }}>
                ships nationwide
              </span>
            </div>
            <h2 className="font-hand font-black leading-[1.08] tracking-tight text-[clamp(2.6rem,6.5vw,4.6rem)]" style={{ color: HERO.cocoa }}>
              not your{' '}
              <span className="line-through decoration-4" style={{ color: HERO.cocoa2, textDecorationColor: HERO.berry }}>grocery-store</span>{' '}
              <span style={{ background: `linear-gradient(transparent 62%, ${HERO.gold} 62% 92%, transparent 92%)` }}>cookies.</span>
            </h2>
            <p className="font-sans font-medium max-w-[46ch] mt-5 text-[1.2rem]" style={{ color: HERO.cocoa2 }}>
              the internet&apos;s favorite bakes, made by hand and shipped fresh.
            </p>
            <div className="flex flex-wrap gap-3 mt-6">
              <a
                href="https://ko-fi.com/merrbakes/shop"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 font-extrabold rounded-full px-6 py-3 text-white transition hover:-translate-y-0.5"
                style={{ background: HERO.berry, boxShadow: `0 6px 0 ${HERO.berryInk}` }}
              >
                🛒 shop the drop
              </a>
              <a
                href="#subscribe"
                className="inline-flex items-center gap-2 font-extrabold rounded-full px-6 py-3"
                style={{ background: HERO.card, color: HERO.cocoa, border: `2px solid ${HERO.line2}`, boxShadow: HERO.shadowSm }}
              >
                get a free recipe →
              </a>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 mt-6 font-semibold text-[.86rem]" style={{ color: HERO.cocoa2 }}>
              <span>⭐ <b style={{ color: HERO.cocoa }}>Loved by 1,000+</b> gang members</span>
              <span>📦 <b style={{ color: HERO.cocoa }}>500+</b> boxes shipped</span>
              <span>🐈 approved by <b style={{ color: HERO.cocoa }}>Void &amp; Mew</b></span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {TREATS.map((t) => (
              <div
                key={t.name}
                className={`rounded-[20px] p-3.5 ${t.mt}`}
                style={{ background: HERO.card, border: `1px solid ${HERO.line}`, boxShadow: HERO.shadowMd, transform: `rotate(${t.rotate})` }}
              >
                <div className="h-28 rounded-2xl flex items-center justify-center text-5xl" style={{ background: t.plate }}>{t.emoji}</div>
                <div className="font-extrabold mt-3 text-[.98rem]" style={{ color: HERO.cocoa }}>{t.name}</div>
                <div className="font-extrabold mt-0.5 text-[.9rem]" style={{ color: HERO.berryInk }}>{t.price}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Twitch CTA */}
      <section className="border-b-4 border-merrbakes-brown p-10 bg-merrbakes-yellow">
        <div className="flex flex-col md:flex-row items-center gap-6 max-w-4xl mx-auto">
          <div className="flex-1">
            <h2 className="text-4xl text-merrbakes-brown mb-2">merrbakes live on twitch</h2>
            <p className="text-merrbakes-brown text-lg italic">watch the batch get made in real time — baking, gaming, and good chat</p>
            <a
              href="https://twitch.tv/merrbakes"
              target="_blank"
              rel="noreferrer"
              className="inline-block mt-4 bg-[#9146ff] text-white px-6 py-2 text-xl rounded hover:opacity-90 transition"
            >
              tune in →
            </a>
          </div>
          <div className="shrink-0 w-16 h-16 bg-[#9146ff] rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="white" className="w-8 h-8" viewBox="0 0 16 16">
              <path d="M3.857 0 1 2.857v10.286h3.429V16l2.857-2.857H9.57L14.714 8V0zm9.714 7.429-2.285 2.285H9l-2 2v-2H4.429V1.143h9.142z"/>
            </svg>
          </div>
        </div>
      </section>

      {/* Alternating grid */}
      <section id="blog" className="p-8">
        <h2 className="text-3xl text-merrbakes-brown border-b-2 border-merrbakes-brown pb-2 mb-8">
          from the kitchen
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-2 border-merrbakes-brown">
          {kofiItems.slice(0, 3).map((item, i) => (
            <div key={`shop-${i}`} className="border border-merrbakes-brown/30">
              <KofiItem item={item} />
              <div className="px-4 pb-4 border-t border-merrbakes-brown/20">
                <p className="text-xs tracking-widest uppercase text-merrbakes-brown/50 mt-2">from the shop</p>
              </div>
            </div>
          ))}
          {reviews.slice(0, 3).map((r, i) => (
            <div key={`review-${i}`} className="border border-merrbakes-brown/30 p-6 bg-white/50 flex flex-col justify-center">
              <p className="text-xs tracking-widest uppercase text-merrbakes-brown/50 mb-3">reader review</p>
              <p className="text-merrbakes-brown italic text-lg leading-relaxed">"{r.content}"</p>
              <p className="text-merrbakes-brown/60 text-sm mt-3">— {r.author}</p>
            </div>
          ))}
          {instaPosts.slice(0, 3).map((post, i) => (
            <div key={`insta-${i}`} className="border border-merrbakes-brown/30">
              <InstagramItem {...post} />
              <div className="px-4 pb-4 border-t border-merrbakes-brown/20">
                <p className="text-xs tracking-widest uppercase text-merrbakes-brown/50 mt-2">from instagram</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Membership card mailing list (from option3) */}
      <section id="subscribe" className="p-8">
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
  );
}
