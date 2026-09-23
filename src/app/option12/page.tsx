"use client";
import { useState, useEffect } from 'react';
import KofiItem from "@/components/KofiItem";
import { KofiItemType } from "@/app/api/types";
import { reviews } from "@/content/reviews";

const mediaTags: ('photo' | 'video')[] = ['photo', 'video', 'photo', 'video', 'photo', 'video', 'photo', 'video'];

function ProofTile({ author, content, type }: { author: string; content: string; type: 'photo' | 'video' }) {
  return (
    <div className="relative shrink-0 w-48 h-72 rounded-2xl overflow-hidden bg-merrbakes-brown/10 border-2 border-merrbakes-brown flex flex-col items-center justify-center">
      <span className="text-5xl mb-2">{type === 'video' ? '🎥' : '📷'}</span>
      <span className="text-xs italic text-merrbakes-brown/60 mb-3">customer {type}</span>
      <div className="absolute bottom-0 inset-x-0 bg-merrbakes-brown/90 text-merrbakes-yellow p-3">
        <p className="text-xs italic leading-snug line-clamp-3">"{content}"</p>
        <p className="text-xs mt-1 text-right opacity-80">— {author}</p>
      </div>
    </div>
  );
}

export default function Option12() {
  const [kofiItems, setKofiItems] = useState<KofiItemType[]>([]);

  useEffect(() => {
    fetch('/api/kofi', { cache: 'no-store' }).then(r => r.json()).then(d => setKofiItems(d.data ?? []));
  }, []);

  const item = kofiItems[0];
  const itemReviews = reviews.slice(0, 8);

  return (
    <main className="min-h-screen bg-merrbakes-pink font-hand">
      <header className="text-center py-10 border-b-4 border-merrbakes-brown">
        <h1 className="text-6xl text-merrbakes-brown">merrbakes</h1>
      </header>

      <section className="max-w-md mx-auto p-8">
        {item ? (
          <KofiItem item={item} className="w-full mx-0" />
        ) : (
          <div className="aspect-square bg-white/60 border-2 border-merrbakes-brown rounded-lg animate-pulse" />
        )}
      </section>

      <section className="pb-16">
        <h3 className="text-2xl text-merrbakes-brown text-center mb-4">scroll the proof →</h3>
        <div className="flex gap-4 overflow-x-auto px-8 pb-4 snap-x snap-mandatory">
          {itemReviews.map((r, i) => (
            <div key={i} className="snap-center">
              <ProofTile author={r.author} content={r.content} type={mediaTags[i % mediaTags.length]} />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
