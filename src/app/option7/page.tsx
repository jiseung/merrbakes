"use client";
import { useState, useEffect } from 'react';
import Image from 'next/image';
import KofiItem from "@/components/KofiItem";
import MailingListItem from "@/components/MailingListItem";
import { KofiItemType } from "@/app/api/types";
import { reviews } from "@/content/reviews";

const giftTags = [
  "your Discord mod",
  "your work bestie",
  "your tired mom",
  "your partner who deserves everything",
  "yourself (no judgment)",
  "that friend who's always there",
];

export default function Option7() {
  const [kofiItems, setKofiItems] = useState<KofiItemType[]>([]);
  const [tagIndex, setTagIndex] = useState(0);

  useEffect(() => {
    fetch('/api/kofi', { cache: 'no-store' }).then(r => r.json()).then(d => setKofiItems(d.data ?? []));
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTagIndex(i => (i + 1) % giftTags.length), 2500);
    return () => clearInterval(id);
  }, []);

  const giftReviews = reviews.filter((_, i) => [0, 2, 4, 6].includes(i));

  return (
    <main className="min-h-screen bg-merrbakes-pink font-hand">
      {/* Gift hero */}
      <section className="flex flex-col items-center justify-center py-20 px-8 text-center max-w-3xl mx-auto">
        <p className="text-merrbakes-brown/60 text-lg tracking-widest uppercase mb-4">the perfect gift for</p>
        <div className="h-16 overflow-hidden relative w-full">
          <p
            key={tagIndex}
            className="text-4xl md:text-5xl text-merrbakes-brown animate-bounce"
            style={{ animation: 'fadeSlide 0.4s ease-in-out' }}
          >
            {giftTags[tagIndex]}
          </p>
        </div>
        <style>{`
          @keyframes fadeSlide {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
        <h1 className="text-7xl text-merrbakes-brown mt-4 mb-4">merrbakes</h1>
        <p className="text-xl text-merrbakes-brown/70 italic max-w-xl">
          know someone who deserves something handmade? real baked goods, made with love, shipped right to their door.
        </p>
        <a
          href="https://ko-fi.com/merrbakes/shop"
          target="_blank"
          rel="noreferrer"
          className="mt-8 bg-merrbakes-brown text-merrbakes-yellow px-10 py-4 rounded-full text-2xl hover:opacity-80 transition shadow-xl"
        >
          shop gifts →
        </a>
      </section>

      {/* How it works */}
      <section className="bg-merrbakes-yellow border-y-4 border-merrbakes-brown py-12 px-8">
        <h2 className="text-3xl text-merrbakes-brown text-center mb-10">how gifting works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto text-center">
          {[
            { step: '1', emoji: '🛒', title: 'pick a treat', desc: 'browse the ko-fi shop and choose something delicious' },
            { step: '2', emoji: '📬', title: 'it ships with love', desc: 'merr packages everything carefully and ships it to you or them' },
            { step: '3', emoji: '🎉', title: 'they love you forever', desc: 'probably' },
          ].map(({ step, emoji, title, desc }) => (
            <div key={step} className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-merrbakes-brown text-merrbakes-yellow flex items-center justify-center text-xl mb-2">
                {step}
              </div>
              <span className="text-5xl">{emoji}</span>
              <h3 className="text-2xl text-merrbakes-brown">{title}</h3>
              <p className="text-merrbakes-brown/70 italic">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Products with gift tags */}
      <section className="p-8">
        <h2 className="text-3xl text-merrbakes-brown text-center mb-8">gift-worthy treats</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {kofiItems.map((item, i) => (
            <div key={i} className="flex flex-col">
              <KofiItem item={item} />
              <div className="mx-5 -mt-2 mb-5 bg-merrbakes-yellow border border-merrbakes-brown rounded-b-lg px-3 py-2 text-sm text-merrbakes-brown italic text-center">
                perfect for: {giftTags[i % giftTags.length]}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Gift reaction reviews */}
      <section className="bg-white/50 px-8 py-12">
        <h2 className="text-3xl text-merrbakes-brown text-center mb-8">what people said when they got the box</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {giftReviews.map((r, i) => (
            <div key={i} className="bg-merrbakes-pink border-2 border-merrbakes-brown rounded-2xl p-6 relative">
              <span className="absolute -top-4 left-6 text-4xl">🎁</span>
              <p className="text-merrbakes-brown italic text-lg leading-relaxed pt-2">"{r.content}"</p>
              <p className="text-merrbakes-brown/60 mt-3 text-sm">— {r.author}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Reminder mailing list */}
      <section className="bg-merrbakes-brown text-merrbakes-yellow py-10 px-8 text-center">
        <h2 className="text-3xl mb-1">we'll remind you before the holidays</h2>
        <p className="text-merrbakes-yellow/60 italic mb-2">birthdays, seasons, special occasions — we've got you</p>
      </section>
      <MailingListItem />
    </main>
  );
}
