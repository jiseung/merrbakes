"use client";
import { useState, useEffect } from 'react';
import KofiItem from "@/components/KofiItem";
import { KofiItemType } from "@/app/api/types";

const DROP_DATE = new Date('2026-05-01T18:00:00');

const pastDrops = [
  { name: "Valentine's Brownie Box", sold: true },
  { name: "St. Patrick's Cookies", sold: true },
  { name: "Spring Lemon Bars", sold: true },
];

function pad(n: number) { return String(n).padStart(2, '0'); }

export default function Option6() {
  const [kofiItems, setKofiItems] = useState<KofiItemType[]>([]);
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0 });
  const [email, setEmail] = useState('');
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    fetch('/api/kofi', { cache: 'no-store' }).then(r => r.json()).then(d => setKofiItems(d.data ?? []));
  }, []);

  useEffect(() => {
    const tick = () => {
      const diff = DROP_DATE.getTime() - Date.now();
      if (diff <= 0) { setTimeLeft({ d: 0, h: 0, m: 0, s: 0 }); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft({ d, h, m, s });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
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
      {/* Hero countdown */}
      <section className="flex flex-col items-center justify-center py-20 px-8 text-center">
        <video className="w-32 h-32 mb-6" autoPlay muted playsInline loop>
          <source src="/logo.mp4" type="video/mp4" />
        </video>
        <h1 className="text-6xl text-merrbakes-brown mb-2">merrbakes</h1>
        <p className="text-merrbakes-brown/70 text-xl italic mb-8">limited batches · ships fast · never the same twice</p>

        <p className="text-merrbakes-brown text-2xl mb-4 tracking-widest uppercase">next drop in</p>
        <div className="flex gap-4 md:gap-8">
          {[
            { label: 'days', value: timeLeft.d },
            { label: 'hours', value: timeLeft.h },
            { label: 'min', value: timeLeft.m },
            { label: 'sec', value: timeLeft.s },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col items-center bg-merrbakes-brown text-merrbakes-yellow rounded-xl px-4 py-3 min-w-16 shadow-xl">
              <span className="text-4xl md:text-6xl font-mono leading-none">{pad(value)}</span>
              <span className="text-sm mt-1 opacity-70">{label}</span>
            </div>
          ))}
        </div>
        <p className="mt-6 text-merrbakes-brown/60 italic">May 1st, 2026 · 6pm EST</p>
      </section>

      {/* Notify CTA */}
      <section className="bg-merrbakes-yellow py-8 px-8 text-center border-y-4 border-merrbakes-brown">
        <h2 className="text-3xl text-merrbakes-brown mb-1">be first to know when the next batch drops</h2>
        <p className="text-merrbakes-brown/60 italic mb-5">drops sell out fast — don't miss it</p>
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-center max-w-lg mx-auto">
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
            {joined ? "you're on the list! ✦" : 'notify me'}
          </button>
        </div>
      </section>

      {/* Currently available shelf */}
      {kofiItems.filter(i => !i.isSoldOut).length > 0 && (
        <section className="p-8">
          <h2 className="text-3xl text-merrbakes-brown text-center mb-1">available now</h2>
          <p className="text-center text-merrbakes-brown/50 italic mb-6">grab these before they're gone</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {kofiItems.filter(i => !i.isSoldOut).map((item, i) => (
              <KofiItem key={i} item={item} />
            ))}
          </div>
        </section>
      )}

      {/* Sold out / past drops (FOMO) */}
      <section className="px-8 pb-12">
        <h2 className="text-3xl text-merrbakes-brown text-center mb-1">previously dropped</h2>
        <p className="text-center text-merrbakes-brown/50 italic mb-6">missed these? subscribe above so you don't miss the next one</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {[
            ...kofiItems.filter(i => i.isSoldOut),
            ...pastDrops.map(p => ({ name: p.name, isSoldOut: true, price: 0, flexiblePrice: false, link: '#', image: '', desc: '', stock: null, preorder: false })),
          ].map((item, i) => (
            <div key={i} className="relative border-2 border-merrbakes-brown/30 rounded-xl p-6 bg-white/40 flex items-center gap-4 opacity-60">
              <span className="text-4xl">🍫</span>
              <div>
                <p className="text-merrbakes-brown text-xl line-through">{item.name}</p>
                <p className="text-merrbakes-brown/60 text-sm">sold out</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
