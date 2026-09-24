"use client";
// /order/[session] — where Stripe Checkout sends buyers after paying. Confirms the
// order (via /api/order/[session], which checks payment with Stripe), clears the
// cart, and is the only delivery point for digital items: each one gets a
// download button. Copy lives in src/content/order.ts.
import { useState, useEffect, use } from "react";
import Image from "next/image";
import Link from "next/link";
import { orderCopy as copy } from "@/content/order";
import type { OrderItem } from "@/lib/orders";
import { useCart } from "@/lib/cart";
import StorefrontHeader from "@/components/StorefrontHeader";

const prose = "font-sans";
const btnPrimary =
  "inline-flex items-center gap-2 bg-merrbakes-berry text-white rounded-full px-6 py-3 text-xl font-bold hover:opacity-85 transition shadow-sm";

const HOME = "/";
const home = (href: string) => (href.startsWith("#") ? HOME + href : href);

export default function OrderPage({ params }: { params: Promise<{ session: string }> }) {
  const { session } = use(params);
  const { clear } = useCart();

  // undefined = loading, null = not found / not paid
  const [items, setItems] = useState<OrderItem[] | null | undefined>(undefined);
  const [perkCode, setPerkCode] = useState<string | null>(null);
  useEffect(() => {
    fetch(`/api/order/${encodeURIComponent(session)}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => {
        setItems(Array.isArray(d?.items) ? d.items : null);
        setPerkCode(typeof d?.clubWeekCode === "string" ? d.clubWeekCode : null);
        if (Array.isArray(d?.items)) clear(); // paid — the cart's done its job
      })
      .catch(() => setItems(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per order
  }, [session]);

  const downloads = (items ?? []).filter((i) => i.digital);
  const others = (items ?? []).filter((i) => !i.digital);
  const isMember = (items ?? []).some((i) => i.membership);
  const [downloaded, setDownloaded] = useState<Set<string>>(new Set());
  const pending = downloads.filter((d) => d.hasFile && !downloaded.has(d.variantId)).length;

  // nudge before leaving while any available file hasn't been downloaded
  useEffect(() => {
    if (pending === 0) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = copy.downloads.leaveWarning; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [pending]);

  return (
    <main className="min-h-screen bg-merrbakes-pink text-merrbakes-brown font-hand">
      <StorefrontHeader logoHref={HOME} ctaHref="/club" resolveHref={home} />

      <div className="max-w-2xl mx-auto px-5 py-16">
        {items === undefined ? (
          <div className="flex flex-col gap-4">
            <div className="h-12 w-2/3 rounded-full bg-white/60 animate-pulse" />
            <div className="h-6 w-1/2 rounded-full bg-white/60 animate-pulse" />
            <div className="h-32 rounded-3xl bg-white/60 animate-pulse mt-4" />
          </div>
        ) : items === null ? (
          <div className="text-center">
            <h1 className="text-4xl font-black">{copy.notFound.heading}</h1>
            <p className={`${prose} text-lg text-merrbakes-brown/70 mt-3`}>{copy.notFound.subhead}</p>
            <div className="flex flex-wrap gap-3 justify-center mt-7">
              <a href={copy.contactHref} target="_blank" rel="noreferrer" className={btnPrimary}>{copy.contactLabel}</a>
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-5xl font-black text-merrbakes-berry">{copy.heading}</h1>
            <p className={`${prose} text-xl text-merrbakes-brown/75 mt-3`}>{copy.subhead}</p>

            {downloads.length > 0 && (
              <section className="mt-8 rounded-3xl border-4 border-merrbakes-berry bg-merrbakes-yellow p-6">
                <h2 className="text-3xl font-black">{copy.downloads.heading}</h2>
                <p className={`${prose} text-lg font-semibold mt-2`}>{copy.downloads.warning}</p>
                <ul className="mt-5 flex flex-col gap-3">
                  {downloads.map((d) => (
                    <li key={d.variantId} className="bg-white rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                      <span className="text-xl font-bold">{d.name}</span>
                      {d.hasFile ? (
                        <a href={`/api/order/${encodeURIComponent(session)}/download/${d.variantId}`}
                           onClick={() => setDownloaded((s) => new Set(s).add(d.variantId))}
                           className={`${btnPrimary} !py-2 !text-lg ${downloaded.has(d.variantId) ? "!bg-merrbakes-green !text-merrbakes-brown" : ""}`}>
                          {downloaded.has(d.variantId) ? copy.downloads.downloadedLabel : copy.downloads.buttonLabel}
                        </a>
                      ) : (
                        <span className={`${prose} text-base text-merrbakes-brown/70`}>{copy.downloads.noFileYet}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {isMember && (
              <section className="mt-8 rounded-3xl bg-merrbakes-green/60 border-2 border-merrbakes-brown/20 p-6">
                <h2 className="text-3xl font-black">{copy.membership.heading}</h2>
                {perkCode && <p className={`${prose} text-lg font-semibold mt-2`}>{copy.membership.perk(perkCode)}</p>}
                <a href="/api/clubs/manage" className="inline-block mt-3 text-lg font-bold text-merrbakes-berry hover:underline">{copy.membership.manage}</a>
              </section>
            )}

            {others.length > 0 && (
              <ul className={`${prose} mt-8 flex flex-col gap-2 text-lg`}>
                {others.map((o, i) => (
                  <li key={o.variantId || i} className="bg-white rounded-2xl px-4 py-3 flex justify-between gap-3 border border-merrbakes-brown/15">
                    <span>{o.name}</span>
                    <span className="text-merrbakes-brown/60">{copy.quantityPrefix}{o.quantity}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-10">
              <Link href="/shop" className="text-lg font-bold text-merrbakes-berry hover:underline">← {copy.backLabel}</Link>
            </div>
          </>
        )}
      </div>

      {/* FOOTER — same as /shop */}
      <footer className="bg-merrbakes-brown text-merrbakes-pink">
        <div className="max-w-6xl mx-auto px-5 py-12 flex flex-wrap justify-between gap-8">
          <div className="max-w-xs flex flex-col items-center text-center">
            <div className="text-[45px] leading-none font-black text-merrbakes-pink">{copy.footer.logo}</div>
            <div className="w-32 h-32 rounded-full relative overflow-hidden border-2 border-merrbakes-pink/40 mt-3">
              <Image src="/merr-photo.png" alt="Merr" fill sizes="128px" className="object-cover" style={{ objectPosition: "center 25%" }} />
            </div>
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
