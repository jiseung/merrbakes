"use client";
import { useState, useEffect } from 'react';
import KofiItem from "@/components/KofiItem";
import { KofiItemType } from "@/app/api/types";
import { reviews } from "@/content/reviews";

const mediaTags: ('photo' | 'video')[] = ['photo', 'video', 'photo', 'video', 'photo', 'video', 'photo', 'video', 'photo', 'video', 'photo', 'video'];

export default function Option15() {
  const [kofiItems, setKofiItems] = useState<KofiItemType[]>([]);

  useEffect(() => {
    fetch('/api/kofi', { cache: 'no-store' }).then(r => r.json()).then(d => setKofiItems(d.data ?? []));
  }, []);

  const item = kofiItems[0];
  const heroReview = reviews[0];
  const gridReviews = reviews.slice(1);

  return (
    <main className="min-h-screen bg-merrbakes-pink font-hand">
      <header className="text-center py-8 border-b-4 border-merrbakes-brown">
        <h1 className="text-6xl text-merrbakes-brown">merrbakes</h1>
      </header>

      <section className="max-w-3xl mx-auto p-8 flex flex-col items-center">
        <div className="relative w-full max-w-md aspect-[9/16] bg-merrbakes-gray rounded-3xl border-8 border-merrbakes-brown flex flex-col items-center justify-center text-merrbakes-yellow shadow-2xl">
          <span className="text-7xl mb-3">🎥</span>
          <p className="italic px-6 text-center opacity-80">customer video review</p>
          <div className="absolute bottom-4 inset-x-4 bg-black/50 rounded-lg p-3">
            <p className="text-sm italic leading-snug">"{heroReview?.content}"</p>
            <p className="text-xs mt-1 text-right opacity-70">— {heroReview?.author}</p>
          </div>
        </div>

        <div className="mt-6 w-full max-w-xs">
          {item ? (
            <KofiItem item={item} className="w-full mx-0" />
          ) : (
            <div className="aspect-square bg-white/60 border-2 border-merrbakes-brown rounded-lg animate-pulse" />
          )}
        </div>
      </section>

      <section className="px-8 pb-16 max-w-5xl mx-auto">
        <h3 className="text-2xl text-merrbakes-brown text-center mb-6">more from happy customers</h3>
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
          {gridReviews.map((r, i) => {
            const type = mediaTags[i % mediaTags.length];
            return (
              <div key={i} className="break-inside-avoid bg-white/70 border-2 border-merrbakes-brown rounded-lg p-4">
                <div className="aspect-video bg-merrbakes-brown/10 border-2 border-dashed border-merrbakes-brown rounded-lg flex flex-col items-center justify-center text-merrbakes-brown/60 mb-3">
                  <span className="text-3xl">{type === 'video' ? '🎥' : '📷'}</span>
                  <span className="text-xs italic mt-1">customer {type}</span>
                </div>
                <p className="text-merrbakes-brown/80 italic text-sm leading-relaxed">"{r.content}"</p>
                <p className="text-merrbakes-brown/60 text-xs mt-2 text-right">— {r.author}</p>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
