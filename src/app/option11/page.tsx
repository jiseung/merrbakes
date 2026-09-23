"use client";
import { useState, useEffect } from 'react';
import Image from 'next/image';
import KofiItem from "@/components/KofiItem";
import { KofiItemType } from "@/app/api/types";
import { reviews } from "@/content/reviews";

const mediaTags: ('photo' | 'video' | 'text')[] = ['photo', 'video', 'text', 'photo', 'video', 'text'];

function MediaSlot({ type }: { type: 'photo' | 'video' | 'text' }) {
  if (type === 'text') return null;
  return (
    <div className="w-full sm:w-40 aspect-square shrink-0 bg-merrbakes-brown/10 border-2 border-dashed border-merrbakes-brown rounded-lg flex flex-col items-center justify-center text-merrbakes-brown/60">
      <span className="text-4xl">{type === 'video' ? '🎥' : '📷'}</span>
      <span className="text-xs italic mt-1">customer {type}</span>
    </div>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="text-merrbakes-brown text-lg">
      {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
    </div>
  );
}

export default function Option11() {
  const [kofiItems, setKofiItems] = useState<KofiItemType[]>([]);

  useEffect(() => {
    fetch('/api/kofi', { cache: 'no-store' }).then(r => r.json()).then(d => setKofiItems(d.data ?? []));
  }, []);

  const item = kofiItems[0];
  const itemReviews = reviews.slice(0, 6);

  return (
    <main className="min-h-screen bg-merrbakes-yellow font-hand">
      <header className="text-center py-10 border-b-4 border-merrbakes-brown">
        <h1 className="text-6xl text-merrbakes-brown">merrbakes</h1>
      </header>

      <section className="max-w-4xl mx-auto p-8 flex flex-col md:flex-row gap-8 items-center">
        <div className="w-full md:w-1/2">
          {item ? (
            <KofiItem item={item} className="w-full mx-0" />
          ) : (
            <div className="aspect-square bg-white/60 border-2 border-merrbakes-brown rounded-lg animate-pulse" />
          )}
        </div>
        <div className="w-full md:w-1/2">
          <h2 className="text-4xl text-merrbakes-brown mb-2">{item?.name ?? 'loading...'}</h2>
          <p className="text-merrbakes-lightgray italic mb-4">{item?.desc}</p>
          <div className="flex items-center gap-2 mb-6">
            <Stars rating={5} />
            <span className="text-merrbakes-brown/70 text-sm">({itemReviews.length} verified buyers)</span>
          </div>
          <a
            href="https://ko-fi.com/merrbakes/shop"
            target="_blank"
            rel="noreferrer"
            className="inline-block bg-merrbakes-brown text-merrbakes-yellow px-8 py-3 rounded-lg text-2xl hover:opacity-80 transition"
          >
            order this →
          </a>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-8 pb-16">
        <h3 className="text-3xl text-merrbakes-brown border-b-2 border-merrbakes-brown pb-2 mb-6 text-center">
          what verified buyers said
        </h3>
        <div className="flex flex-col gap-6">
          {itemReviews.map((r, i) => (
            <div key={i} className="flex flex-col sm:flex-row gap-4 bg-white/70 border-2 border-merrbakes-brown rounded-lg p-5">
              <MediaSlot type={mediaTags[i % mediaTags.length]} />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-merrbakes-brown">{r.author}</span>
                  <Stars rating={4 + (i % 2)} />
                </div>
                <p className="text-merrbakes-brown/80 italic leading-relaxed">"{r.content}"</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
