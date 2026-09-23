"use client";
// /shop/[slug] — a single-product detail page, linked from the /shop grid.
// Prototype note: Notion's Shop Items database only has one Photo, so the extra
// photo-gallery slots below are still a UI mockup (same spirit as the mocked
// reviews in /option11) — but the variant picker is real data now, see
// merrbakes.md "variant-level checkout wiring". Copy lives in
// src/content/product.ts — edit that file for text changes.
import { useState, useEffect, use } from "react";
import Image from "next/image";
import Link from "next/link";
import { productCopy as copy } from "@/content/product";
import { DropItem, Variant, displayName, slugify, priceToCents, variantDisplayName } from "@/lib/shopItems";
import { reviews } from "@/content/reviews";
import { useCart } from "@/lib/cart";
import StorefrontHeader from "@/components/StorefrontHeader";

const prose = "font-sans";
const btnPrimary =
  "inline-flex items-center gap-2 bg-merrbakes-berry text-white rounded-full px-6 py-3 text-xl font-bold hover:opacity-85 transition shadow-sm";

// storefront anchors (#club, #blog, #watch) live on the homepage (/), not this page
const HOME = "/";
const home = (href: string) => (href.startsWith("#") ? HOME + href : href);

function Stars({ rating }: { rating: number }) {
  return <div className="text-merrbakes-yellow text-xl tracking-widest">{"★".repeat(rating)}{"☆".repeat(5 - rating)}</div>;
}

export default function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { add } = useCart();

  // pool includes baked-goods (Single), merch, and digital items — a product card
  // can link here from any of those grids on /shop, so the lookup has to cover all three.
  const [items, setItems] = useState<DropItem[] | null>(null);
  useEffect(() => {
    Promise.all([
      fetch("/api/notion-shop", { cache: "no-store" }).then((res) => res.json()),
      fetch("/api/notion-shop?type=merch", { cache: "no-store" }).then((res) => res.json()),
      fetch("/api/notion-shop?type=digital", { cache: "no-store" }).then((res) => res.json()),
    ])
      .then(([single, merch, digital]) => {
        const singleItems = Array.isArray(single.data) ? single.data : [];
        const merchItems = Array.isArray(merch.data) ? merch.data : [];
        const digitalItems = Array.isArray(digital.data) ? digital.data : [];
        setItems([...singleItems, ...merchItems, ...digitalItems]);
      })
      .catch(() => setItems([]));
  }, []);

  const [allVariants, setAllVariants] = useState<Variant[]>([]);
  useEffect(() => {
    fetch("/api/notion-variants", { cache: "no-store" })
      .then((res) => res.json())
      .then((d) => { if (Array.isArray(d.data)) setAllVariants(d.data); })
      .catch(() => {});
  }, []);

  const item = items?.find((it) => slugify(it.name) === slug) ?? null;
  const itemVariants = item
    ? allVariants.filter((v) => v.shopItemId === item.id).sort((a, b) => priceToCents(a.price) - priceToCents(b.price))
    : [];

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  // pick the item's Default variant once its variants have loaded
  useEffect(() => {
    if (selectedVariantId || itemVariants.length === 0) return;
    setSelectedVariantId((itemVariants.find((v) => v.isDefault) ?? itemVariants[0]).id);
  }, [itemVariants, selectedVariantId]);
  const selectedVariant = itemVariants.find((v) => v.id === selectedVariantId) ?? itemVariants[0] ?? null;

  // Notion's Shop Items db only has one Photo per item right now, so the
  // thumbnail strip below has a single (real) thumbnail — activePhoto is
  // wired up for when there's more than one to switch between.
  const [activePhoto, setActivePhoto] = useState(0);

  const itemReviews = reviews.slice(0, 4);

  const [added, setAdded] = useState(false);
  function addToCart() {
    if (!item || !selectedVariant) return;
    add({
      variantId: selectedVariant.id,
      name: variantDisplayName(displayName(item.name), selectedVariant.name, itemVariants.length),
      slug,
      price: selectedVariant.price,
      priceCents: priceToCents(selectedVariant.price),
      photoUrl: item.photoUrl ?? null,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <main className="min-h-screen bg-merrbakes-pink text-merrbakes-brown font-hand">
      {/* NAV — identical to /shop */}
      <StorefrontHeader logoHref={HOME} ctaHref={home("#club")} resolveHref={home} />

      <div className="max-w-6xl mx-auto px-5 py-12">
        <Link href="/shop" className="inline-block mb-6 text-lg font-bold text-merrbakes-berry hover:underline">{copy.backLink}</Link>

        {items === null ? (
          <div className="grid lg:grid-cols-2 gap-10">
            <div className="aspect-square bg-white/60 rounded-3xl animate-pulse" />
            <div className="flex flex-col gap-4">
              <div className="h-10 w-2/3 bg-white/60 rounded-full animate-pulse" />
              <div className="h-6 w-1/3 bg-white/60 rounded-full animate-pulse" />
            </div>
          </div>
        ) : !item ? (
          <div className="text-center py-20">
            <h1 className="text-3xl font-black">{copy.notFound.heading}</h1>
            <p className={`${prose} text-lg text-merrbakes-brown/70 mt-2`}>{copy.notFound.subhead}</p>
            <Link href="/shop" className={`${btnPrimary} mt-6`}>{copy.notFound.buttonLabel}</Link>
          </div>
        ) : (
          <>
            {/* PRODUCT */}
            <div className="grid lg:grid-cols-2 gap-10">
              {/* photo gallery */}
              <div>
                <div className="aspect-square rounded-3xl overflow-hidden border border-merrbakes-brown/15 bg-white relative">
                  {item.photoUrl ? (
                    <Image src={item.photoUrl} alt={item.name} fill sizes="(max-width: 1024px) 90vw, 500px" className="object-cover" />
                  ) : (
                    <div className="absolute inset-0 grid place-items-center text-7xl">🍪</div>
                  )}
                </div>
                {item.photoUrl && (
                  <div className="flex gap-3 mt-3">
                    <button type="button" onClick={() => setActivePhoto(0)}
                            className={`w-16 h-16 rounded-xl overflow-hidden border-2 relative ${activePhoto === 0 ? "border-merrbakes-berry" : "border-transparent"}`}>
                      <Image src={item.photoUrl} alt="" fill sizes="64px" className="object-cover" />
                    </button>
                  </div>
                )}
              </div>

              {/* details */}
              <div>
                <h1 className="text-4xl font-black">{displayName(item.name)}</h1>
                <div className="text-2xl font-black text-merrbakes-berry mt-2">{selectedVariant?.price ?? item.price}</div>
                <div className={`${prose} inline-flex items-center gap-1.5 text-sm font-bold text-merrbakes-brown/70 bg-merrbakes-yellow/40 rounded-full px-3 py-1 mt-2`}>
                  {copy.shipsNote}
                </div>

                <div className={`${prose} text-merrbakes-brown/80 mt-5 flex flex-col gap-3 max-w-lg`}>
                  {(item.description ?? "").split(/\n\s*\n/).map((p, i) => <p key={i}>{p.trim()}</p>)}
                </div>

                {itemVariants.length > 1 && (
                  <div className="mt-7">
                    <div className="text-lg font-bold">{copy.variantPickerLabel}</div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {itemVariants.map((v) => (
                        <button key={v.id} type="button" onClick={() => setSelectedVariantId(v.id)}
                                className={`rounded-full px-4 py-2 text-base font-bold border-2 transition ${selectedVariantId === v.id
                                  ? "bg-merrbakes-berry text-white border-merrbakes-berry"
                                  : "bg-white text-merrbakes-brown border-merrbakes-brown/30 hover:border-merrbakes-berry"}`}>
                          {v.name} — {v.price}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-7 flex flex-col gap-2 items-start">
                  <button type="button" onClick={addToCart} className={btnPrimary}>
                    {added ? copy.addedButtonLabel : copy.addButtonLabel}
                  </button>
                  <a href={copy.kofiLink.href} target="_blank" rel="noreferrer"
                     className={`${prose} text-base font-bold text-merrbakes-brown/60 hover:text-merrbakes-berry underline`}>
                    {copy.kofiLink.label}
                  </a>
                </div>
              </div>
            </div>

            {/* REVIEWS — general reviews, not verified for this specific item (no per-item review data yet) */}
            <div className="mt-16 pt-10 border-t border-merrbakes-brown/15">
              <div className="text-merrbakes-berry text-lg font-bold lowercase tracking-wide">{copy.reviews.eyebrow}</div>
              <div className="grid md:grid-cols-2 gap-5 mt-3">
                {itemReviews.map((r, i) => (
                  <div key={i} className="bg-white rounded-2xl p-6 border border-merrbakes-brown/15 shadow-sm">
                    <Stars rating={5} />
                    <p className={`${prose} mt-2.5 mb-3.5 text-lg`}>&ldquo;{r.content.trim()}&rdquo;</p>
                    <div className="text-base font-bold text-merrbakes-brown/60">— {r.author}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* FOOTER */}
      <footer className="bg-merrbakes-brown text-merrbakes-pink">
        <div className="max-w-6xl mx-auto px-5 py-12 flex flex-wrap justify-between gap-8">
          <div className="max-w-xs">
            <div className="text-3xl font-black text-merrbakes-pink">{copy.footer.logo}</div>
          </div>
          <div className="flex gap-12 flex-wrap text-lg">
            {copy.footer.columns.map((col) => (
              <div key={col.title}>
                <div className={`${prose} uppercase tracking-widest opacity-50 text-sm mb-2`}>{col.title}</div>
                {col.links.map((l) => (
                  <a key={l.label} href={home(l.href)} className="block opacity-85 hover:opacity-100 py-0.5">{l.label}</a>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className={`${prose} max-w-6xl mx-auto px-5 pb-10 opacity-50 text-base`}>{copy.footer.copyright}</div>
      </footer>
    </main>
  );
}
