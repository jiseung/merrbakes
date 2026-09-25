"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { productCopy as copy } from "@/content/product";

// Reviews section for /shop/[slug]. Fields mirror the planned Notion reviews
// database: customer name, text, optional photo. No star ratings (owner, 2026-09-25).
export type Review = {
  name: string;
  date: string; // YYYY-MM-DD
  text: string;
  photoUrl?: string | null;
  usePhoto?: boolean; // mockup only: show the product's own photo as the review photo
};

const prose = "font-sans";

export default function ProductReviews({ reviews, fallbackPhotoUrl }: { reviews: Review[]; fallbackPhotoUrl?: string | null }) {
  // enlarged review photo (lightbox); closes on backdrop click, ✕ or Escape
  const [enlarged, setEnlarged] = useState<{ src: string; alt: string } | null>(null);
  useEffect(() => {
    if (!enlarged) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setEnlarged(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enlarged]);

  if (reviews.length === 0) return null;

  return (
    <section className="mt-16">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="text-3xl font-black">{copy.reviews.heading}</h2>
        <div className={`${prose} text-merrbakes-brown/70`}>
          {reviews.length} {reviews.length === 1 ? copy.reviews.countOne : copy.reviews.countMany}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5 mt-6">
        {reviews.map((r, i) => {
          const photo = r.photoUrl ?? (r.usePhoto ? fallbackPhotoUrl : null);
          const name = r.name.trim() || copy.reviews.anonymousName;
          return (
            <article key={i} className="bg-white rounded-3xl border border-merrbakes-brown/15 p-5 flex gap-4">
              <div className="flex-1 min-w-0">
                <p className={`${prose} text-merrbakes-brown/85`}>{r.text}</p>
                <div className="mt-3 text-lg font-bold">{name}</div>
                <div className={`${prose} text-sm text-merrbakes-brown/50`}>
                  {new Date(`${r.date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </div>
              </div>
              {photo && (
                <button type="button" onClick={() => setEnlarged({ src: photo, alt: `${copy.reviews.photoAlt} ${name}` })}
                        aria-label={`${copy.reviews.enlargeLabel} ${name}`}
                        className="w-24 h-24 rounded-2xl overflow-hidden relative shrink-0 border border-merrbakes-brown/15 cursor-zoom-in hover:opacity-90 transition">
                  <Image src={photo} alt={`${copy.reviews.photoAlt} ${name}`} fill sizes="96px" className="object-cover" />
                </button>
              )}
            </article>
          );
        })}
      </div>

      {enlarged && (
        <div className="fixed inset-0 z-50 bg-black/80 grid place-items-center p-4 cursor-zoom-out"
             onClick={() => setEnlarged(null)} role="dialog" aria-modal="true" aria-label={enlarged.alt}>
          <button type="button" onClick={() => setEnlarged(null)} aria-label={copy.reviews.closePhotoLabel}
                  className="absolute top-4 right-4 text-white text-3xl px-3 hover:opacity-70">✕</button>
          <div className="relative w-full max-w-3xl h-[80vh]">
            <Image src={enlarged.src} alt={enlarged.alt} fill sizes="(max-width: 768px) 100vw, 768px" className="object-contain" />
          </div>
        </div>
      )}
    </section>
  );
}
