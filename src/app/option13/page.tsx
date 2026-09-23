"use client";
import { useState, useEffect } from 'react';
import KofiItem from "@/components/KofiItem";
import { KofiItemType } from "@/app/api/types";
import { reviews } from "@/content/reviews";

const mediaTags: ('photo' | 'video' | 'text')[] = ['photo', 'video', 'text', 'photo', 'video'];

export default function Option13() {
  const [kofiItems, setKofiItems] = useState<KofiItemType[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    fetch('/api/kofi', { cache: 'no-store' }).then(r => r.json()).then(d => setKofiItems(d.data ?? []));
  }, []);

  const item = kofiItems[0];
  const itemReviews = reviews.slice(0, 5);
  const current = itemReviews[index];
  const type = mediaTags[index % mediaTags.length];

  return (
    <main className="min-h-screen bg-merrbakes-yellow font-hand flex flex-col">
      <header className="text-center py-8 border-b-4 border-merrbakes-brown">
        <h1 className="text-6xl text-merrbakes-brown">merrbakes</h1>
      </header>

      <section className="flex-1 flex flex-col md:flex-row">
        <div className="w-full md:w-1/2 flex items-center justify-center p-10 bg-white/40 border-b-4 md:border-b-0 md:border-r-4 border-merrbakes-brown">
          {item ? (
            <KofiItem item={item} className="w-full max-w-sm mx-0" />
          ) : (
            <div className="aspect-square w-full max-w-sm bg-white/60 border-2 border-merrbakes-brown rounded-lg animate-pulse" />
          )}
        </div>

        <div className="w-full md:w-1/2 flex flex-col items-center justify-center p-10 gap-6">
          {type !== 'text' && (
            <div className="w-48 h-48 bg-merrbakes-brown/10 border-2 border-dashed border-merrbakes-brown rounded-lg flex flex-col items-center justify-center text-merrbakes-brown/60">
              <span className="text-5xl">{type === 'video' ? '🎥' : '📷'}</span>
              <span className="text-xs italic mt-1">customer {type}</span>
            </div>
          )}
          <p className="text-2xl text-merrbakes-brown italic text-center leading-relaxed max-w-md">
            "{current?.content}"
          </p>
          <p className="text-merrbakes-brown/70">— {current?.author}</p>

          <div className="flex gap-2 mt-4">
            {itemReviews.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className={`w-3 h-3 rounded-full border-2 border-merrbakes-brown ${i === index ? 'bg-merrbakes-brown' : 'bg-transparent'}`}
                aria-label={`review ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
