"use client";
import { useState, useEffect } from 'react';
import KofiItem from "@/components/KofiItem";
import { KofiItemType } from "@/app/api/types";
import { reviews } from "@/content/reviews";

const mediaTags: ('photo' | 'video' | 'text')[] = ['text', 'photo', 'text', 'video', 'text', 'photo', 'text', 'video', 'text', 'photo'];

function Stars({ rating }: { rating: number }) {
  return <span className="text-merrbakes-brown">{'★'.repeat(rating)}{'☆'.repeat(5 - rating)}</span>;
}

export default function Option14() {
  const [kofiItems, setKofiItems] = useState<KofiItemType[]>([]);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/kofi', { cache: 'no-store' }).then(r => r.json()).then(d => setKofiItems(d.data ?? []));
  }, []);

  const item = kofiItems[0];
  const itemReviews = reviews;

  return (
    <main className="min-h-screen bg-merrbakes-yellow font-hand">
      <header className="text-center py-8 border-b-4 border-merrbakes-brown">
        <h1 className="text-6xl text-merrbakes-brown">merrbakes</h1>
      </header>

      <section className="max-w-2xl mx-auto p-8">
        <div className="flex flex-col sm:flex-row gap-6 items-center bg-white/70 border-2 border-merrbakes-brown rounded-lg p-6 mb-8">
          {item ? (
            <KofiItem item={item} className="w-40 h-40 mx-0 aspect-square" />
          ) : (
            <div className="w-40 h-40 bg-white/60 border-2 border-merrbakes-brown rounded-lg animate-pulse shrink-0" />
          )}
          <div>
            <h2 className="text-3xl text-merrbakes-brown">{item?.name ?? 'loading...'}</h2>
            <p className="text-merrbakes-brown/70 italic">{item?.desc}</p>
            <span className="inline-block mt-2 bg-merrbakes-green text-merrbakes-gray text-sm px-3 py-1 rounded-full">
              🔁 people keep reordering this
            </span>
          </div>
        </div>

        <h3 className="text-2xl text-merrbakes-brown mb-4 text-center">verified reviews ({itemReviews.length})</h3>
        <div className="flex flex-col gap-2">
          {itemReviews.map((r, i) => {
            const open = openIndex === i;
            const type = mediaTags[i % mediaTags.length];
            return (
              <div key={i} className="border-2 border-merrbakes-brown rounded-lg bg-white/60 overflow-hidden">
                <button
                  onClick={() => setOpenIndex(open ? null : i)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left"
                >
                  <span className="flex items-center gap-3">
                    <Stars rating={4 + (i % 2)} />
                    <span className="text-merrbakes-brown">{r.author}</span>
                  </span>
                  <span className="text-merrbakes-brown/60">{open ? '−' : '+'}</span>
                </button>
                {open && (
                  <div className="px-4 pb-4 flex flex-col sm:flex-row gap-4">
                    {type !== 'text' && (
                      <div className="w-full sm:w-32 aspect-square shrink-0 bg-merrbakes-brown/10 border-2 border-dashed border-merrbakes-brown rounded-lg flex flex-col items-center justify-center text-merrbakes-brown/60">
                        <span className="text-3xl">{type === 'video' ? '🎥' : '📷'}</span>
                        <span className="text-xs italic mt-1">customer {type}</span>
                      </div>
                    )}
                    <p className="text-merrbakes-brown/80 italic leading-relaxed">"{r.content}"</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
