"use client";
// /shop — a dedicated storefront page. The nav and the menu grid are pulled
// verbatim from option16 (same nav, same menu grid); the rest of the page
// (hero copy, footer) lives in content/shop.ts.
import { useState, useEffect, useMemo, FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { option16Copy as o16, Plate } from "@/content/option16";
import { shopCopy as copy } from "@/content/shop";
import { DropItem, Variant, displayName, slugify, priceToCents, variantDisplayName } from "@/lib/shopItems";
import { CalendarMonth } from "@/lib/calendar";
import { formatMonth } from "@/lib/format";
import { useCart } from "@/lib/cart";
import StorefrontHeader from "@/components/StorefrontHeader";

const plates: Record<Plate, string> = {
  choc: "radial-gradient(circle at 32% 28%,#c98a5e,transparent 55%),linear-gradient(140deg,#6b4429,#4a2c17)",
  straw: "radial-gradient(circle at 30% 30%,#ffd9e2,transparent 55%),linear-gradient(140deg,#f5a9c0,#e06a92)",
  butter: "radial-gradient(circle at 30% 30%,#ffe9b0,transparent 55%),linear-gradient(140deg,#f0c869,#d99a3c)",
  matcha: "radial-gradient(circle at 30% 30%,#d7ecc4,transparent 55%),linear-gradient(140deg,#9cc47b,#5f9e6a)",
};

const prose = "font-sans";
const h2 = "text-4xl font-black mt-1";

// storefront anchors (#club, #blog, #watch) live on the homepage (/), not this page
const HOME = "/";
const home = (href: string) => (href.startsWith("#") ? HOME + href : href);

// shared by the main menu grid and the merch grid below it
function ProductCard({ item, highlighted, onAdd, addDisabled }: { item: DropItem; highlighted?: boolean; onAdd: (item: DropItem) => void; addDisabled?: boolean }) {
  return (
    <div className={`relative bg-white rounded-2xl overflow-hidden hover:-translate-y-1 hover:shadow-md transition flex flex-col h-72 ${highlighted ? "ring ring-merrbakes-berry shadow-md" : "border border-merrbakes-brown/15 shadow-sm"}`}>
      <Link href={`/shop/${slugify(item.name)}`} className="absolute inset-0 z-10" aria-label={item.name} />
      {/* image is 75% of the card height, info strip below is the other 25% */}
      <div className="relative flex-[3]">
        {item.photoUrl ? (
          <Image src={item.photoUrl} alt={item.name} fill sizes="(max-width: 768px) 45vw, 220px" className="object-cover" />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-5xl" style={{ background: plates[item.plate ?? "butter"] }}>{item.icon ?? "🍪"}</div>
        )}
        {item.tag && (
          <span className={`absolute top-2.5 left-2.5 text-sm font-bold rounded-full px-2.5 py-1 ${item.limited ? "bg-merrbakes-brown text-merrbakes-yellow" : "bg-merrbakes-yellow text-merrbakes-brown"}`}>{item.tag}</span>
        )}
        <button type="button"
           onClick={() => onAdd(item)}
           disabled={addDisabled}
           className="absolute bottom-2.5 right-2.5 z-20 bg-merrbakes-berry text-white rounded-full px-4 py-1.5 text-lg font-bold hover:opacity-85 transition shadow-sm disabled:opacity-60 disabled:animate-pulse disabled:cursor-wait">{o16.menu.addButtonLabel}</button>
      </div>
      <div className="relative flex-1 px-3 py-2">
        <div className="text-lg font-bold leading-tight line-clamp-2 pr-14">{item.name}</div>
        <span className="absolute bottom-2 right-3 text-lg font-black text-merrbakes-berry">{item.price}</span>
      </div>
    </div>
  );
}

function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-merrbakes-brown/15 shadow-sm flex flex-col h-72">
      <div className="flex-[3] bg-merrbakes-pink/30 animate-pulse" />
      <div className="flex-1 px-3 py-2 flex flex-col justify-center gap-2">
        <div className="h-4 w-2/3 rounded-full bg-merrbakes-pink/30 animate-pulse" />
        <div className="h-4 w-1/4 rounded-full bg-merrbakes-pink/30 animate-pulse" />
      </div>
    </div>
  );
}

export default function ShopPage() {
  const { add } = useCart();

  // full menu — live from Notion (all Shop Items rows, no cap — this is the page
  // homepage's teaser grid links out to). null = still loading (skeleton cards);
  // [] = loaded but empty / fetch failed (no skeletons pulsing forever).
  const [menuItems, setMenuItems] = useState<DropItem[] | null>(null);
  useEffect(() => {
    fetch("/api/notion-shop", { cache: "no-store" })
      .then((res) => res.json())
      .then((d) => setMenuItems(Array.isArray(d.data) ? d.data : []))
      .catch(() => setMenuItems([]));
  }, []);

  // variants — needed so the grid's quick "add" button can add the right priced
  // SKU (an item's Default variant) instead of a flat item-level price.
  // Add buttons stay disabled until these arrive (they'd silently do nothing otherwise).
  const [variants, setVariants] = useState<Variant[]>([]);
  const [variantsLoaded, setVariantsLoaded] = useState(false);
  useEffect(() => {
    fetch("/api/notion-variants", { cache: "no-store" })
      .then((res) => res.json())
      .then((d) => { if (Array.isArray(d.data)) setVariants(d.data); })
      .catch(() => {})
      .finally(() => setVariantsLoaded(true));
  }, []);

  // "see what's baking this month" toggle — same calendar image/source as
  // option16's watch section, just shown/hidden here instead of always-visible.
  // undefined = still loading (skeleton if the toggle's open); null = no calendar.
  const [calendar, setCalendar] = useState<CalendarMonth | null | undefined>(undefined);
  useEffect(() => {
    fetch("/api/notion-calendar", { cache: "no-store" })
      .then((res) => res.json())
      .then((d) => setCalendar(Array.isArray(d.data) && d.data.length > 0 ? d.data[0] : null))
      .catch(() => setCalendar(null));
  }, []);
  const [showCalendar, setShowCalendar] = useState(false);
  // lets other pages deep-link straight to the open calendar (e.g. /shop?calendar=1
  // from the club FAQ) instead of landing here and having to click the toggle.
  // Read directly off window.location rather than useSearchParams() so this page
  // can stay statically prerendered (that hook forces a Suspense boundary/CSR bailout).
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("calendar") === "1") setShowCalendar(true);
  }, []);

  // baked goods vs. merch — a link toggle swaps which grid the MENU section
  // shows, rather than stacking both as separate always-visible sections.
  const [view, setView] = useState<"baked" | "merch">("baked");

  // merch (t-shirts, stickers, etc.) — separate Type in the same Shop Items db.
  const [merchItems, setMerchItems] = useState<DropItem[]>([]);
  useEffect(() => {
    fetch("/api/notion-shop?type=merch", { cache: "no-store" })
      .then((res) => res.json())
      .then((d) => { if (Array.isArray(d.data)) setMerchItems(d.data); })
      .catch(() => {});
  }, []);

  // digital recipe cards — shown below the merch grid while in merch view.
  const [digitalItems, setDigitalItems] = useState<DropItem[]>([]);
  useEffect(() => {
    fetch("/api/notion-shop?type=digital", { cache: "no-store" })
      .then((res) => res.json())
      .then((d) => { if (Array.isArray(d.data)) setDigitalItems(d.data); })
      .catch(() => {});
  }, []);

  // ids of items with at least one on-schedule variant — drives both the sort
  // order and the card highlight below, while the calendar's open.
  const onScheduleIds = useMemo(
    () => new Set(variants.filter((v) => v.onSchedule).map((v) => v.shopItemId)),
    [variants]
  );

  // while the calendar's open, surface items with an on-schedule variant first —
  // a stable sort, so items with no schedule tie-break by their existing (Notion)
  // order rather than jumping around.
  const isOnSchedule = (item: DropItem) => !!item.id && onScheduleIds.has(item.id);
  const sortedMenuItems = useMemo(() => {
    if (!menuItems) return [];
    if (!showCalendar) return menuItems;
    return [...menuItems].sort((a, b) => Number(isOnSchedule(b)) - Number(isOnSchedule(a)));
  }, [menuItems, onScheduleIds, showCalendar]);

  // keep the grid to ~4 rows (16 items, at the 4-column desktop layout) by default so
  // the page doesn't feel endless — but on-schedule items are never hidden behind the
  // "show more" click, even if that pushes the visible count a bit past the cap.
  const ROWS_CAP_ITEMS = 16;
  const [showAllItems, setShowAllItems] = useState(false);
  const { visibleItems, hiddenCount } = useMemo(() => {
    if (showAllItems) return { visibleItems: sortedMenuItems, hiddenCount: 0 };

    // calendar open — only on-schedule items show up front; everything else
    // waits behind "show more" regardless of the row cap below.
    if (showCalendar) {
      const onSched = sortedMenuItems.filter((it) => isOnSchedule(it));
      const rest = sortedMenuItems.filter((it) => !isOnSchedule(it));
      return { visibleItems: onSched, hiddenCount: rest.length };
    }

    if (sortedMenuItems.length <= ROWS_CAP_ITEMS) {
      return { visibleItems: sortedMenuItems, hiddenCount: 0 };
    }
    const onSched = sortedMenuItems.filter((it) => isOnSchedule(it));
    const rest = sortedMenuItems.filter((it) => !isOnSchedule(it));
    const remaining = Math.max(ROWS_CAP_ITEMS - onSched.length, 0);
    const visible = [...onSched, ...rest.slice(0, remaining)];
    return { visibleItems: visible, hiddenCount: sortedMenuItems.length - visible.length };
  }, [sortedMenuItems, showAllItems, onScheduleIds, showCalendar]);

  function addDefaultVariant(item: DropItem) {
    if (!item.id) return;
    const itemVariants = variants.filter((v) => v.shopItemId === item.id);
    const variant = itemVariants.find((v) => v.isDefault) ?? itemVariants[0];
    if (!variant) return;
    add({
      variantId: variant.id,
      name: variantDisplayName(displayName(item.name), variant.name, itemVariants.length),
      slug: slugify(item.name),
      price: variant.price,
      priceCents: priceToCents(variant.price),
      photoUrl: item.photoUrl ?? null,
      icon: item.icon,
      plate: item.plate,
    });
  }

  // custom order request — a simple form that writes to the "merrbakes.com
  // contact queries" Notion database via /api/custom-order.
  const [customOrder, setCustomOrder] = useState({ name: "", email: "", message: "" });
  const [customOrderStatus, setCustomOrderStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [showCustomOrderForm, setShowCustomOrderForm] = useState(false);
  async function submitCustomOrder(e: FormEvent) {
    e.preventDefault();
    setCustomOrderStatus("sending");
    try {
      const res = await fetch("/api/custom-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customOrder),
      });
      const data = await res.json();
      if (data.success) {
        setCustomOrderStatus("sent");
        setCustomOrder({ name: "", email: "", message: "" });
      } else {
        setCustomOrderStatus("error");
      }
    } catch {
      setCustomOrderStatus("error");
    }
  }

  return (
    <main className="min-h-screen bg-merrbakes-pink text-merrbakes-brown font-hand">
      {/* NAV — identical to option16 */}
      <StorefrontHeader logoHref={HOME} ctaHref={home("#club")} resolveHref={home} />

      {/* MENU */}
      <section className="max-w-6xl mx-auto px-5 py-16">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className={`${h2} text-merrbakes-berry`}>{view === "merch" ? copy.merch.heading : copy.hero.heading}</h1>
            <p className={`${prose} text-xl text-merrbakes-brown/75 mt-2`}>{view === "merch" ? copy.merch.subhead : copy.hero.subhead}</p>
            {merchItems.length > 0 && (
              <button type="button" onClick={() => setView(view === "merch" ? "baked" : "merch")}
                 className={`${prose} block text-base font-bold text-merrbakes-brown/60 hover:text-merrbakes-berry underline mt-2`}>
                {view === "merch" ? copy.merch.backLabel : copy.merch.linkLabel} →
              </button>
            )}
          </div>
          {view === "baked" && (
            <button type="button" onClick={() => setShowCalendar((v) => !v)}
               className={`${prose} inline-flex items-center gap-2 shrink-0 rounded-full px-4 py-2 text-base font-bold border-2 transition ${showCalendar
                 ? "bg-merrbakes-berry text-white border-merrbakes-berry"
                 : "bg-white text-merrbakes-brown border-merrbakes-brown/30 hover:border-merrbakes-berry"}`}>
              {showCalendar ? copy.calendarToggle.hideLabel : copy.calendarToggle.showLabel}
            </button>
          )}
        </div>

        {view === "merch" ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {merchItems.map((it) => (
                <ProductCard key={it.name} item={it} onAdd={addDefaultVariant} addDisabled={!variantsLoaded} />
              ))}
            </div>
            {digitalItems.length > 0 && (
              <div className="mt-12">
                <h2 className={h2}>{copy.digital.heading}</h2>
                <p className={`${prose} text-lg text-merrbakes-brown/75 mt-2 mb-6`}>{copy.digital.subhead}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {digitalItems.map((it) => (
                    <ProductCard key={it.name} item={it} onAdd={addDefaultVariant} addDisabled={!variantsLoaded} />
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {showCalendar && calendar === undefined && (
              <div className="w-full md:w-1/2 aspect-[4/3] rounded-2xl bg-white/60 animate-pulse mb-8 mx-auto" />
            )}
            {showCalendar && calendar?.photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- unknown dimensions from Notion;
              // full width on mobile, capped narrower on md+ so it doesn't dominate the page
              <img src={calendar.photoUrl} alt={`stream schedule — ${formatMonth(calendar.month)}`} className="w-full md:w-1/2 h-auto rounded-2xl shadow-md ring ring-merrbakes-berry mb-8 mx-auto" />
            )}
            {showCalendar && !!menuItems?.length && variantsLoaded && visibleItems.length === 0 && (
              <p className={`${prose} text-center text-merrbakes-brown/60 text-lg mb-8`}>{copy.calendarToggle.emptyMessage}</p>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* with the calendar open, which items show depends on variants' On Schedule flags */}
              {menuItems === null || (showCalendar && !variantsLoaded)
                ? Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)
                : visibleItems.map((it) => (
                    <ProductCard key={it.name} item={it} highlighted={showCalendar && isOnSchedule(it)} onAdd={addDefaultVariant} addDisabled={!variantsLoaded} />
                  ))}
            </div>
            {hiddenCount > 0 && !(showCalendar && !variantsLoaded) && (
              <div className="text-center mt-6">
                <button type="button" onClick={() => setShowAllItems(true)}
                   className="inline-flex items-center gap-2 bg-white text-merrbakes-brown border-2 border-merrbakes-brown/30 rounded-full px-6 py-3 text-xl font-bold hover:border-merrbakes-berry transition">
                  show {hiddenCount} more →
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* CUSTOM ORDERS */}
      <section className="bg-white/70 border-y border-merrbakes-brown/15">
        <div className="max-w-6xl mx-auto px-5 py-16 text-center">
          <div className="text-merrbakes-berry text-lg font-bold lowercase tracking-wide">{copy.customOrders.eyebrow}</div>
          <h2 className={`${h2} mt-1`}>{copy.customOrders.heading}</h2>
          <p className={`${prose} text-xl text-merrbakes-brown/75 mt-3 max-w-lg mx-auto`}>{copy.customOrders.subhead}</p>

          {customOrderStatus === "sent" ? (
            <p className={`${prose} text-xl mt-7 max-w-md mx-auto`}>{copy.customOrders.successMessage}</p>
          ) : !showCustomOrderForm ? (
            <button type="button" onClick={() => setShowCustomOrderForm(true)}
                    className="inline-flex items-center gap-2 bg-merrbakes-berry text-white rounded-full px-6 py-3 text-xl font-bold hover:opacity-85 transition shadow-sm mt-7 mr-4">
              {copy.customOrders.openLabel}
            </button>
          ) : (
            <form onSubmit={submitCustomOrder} className="mt-7 max-w-md mx-auto flex flex-col gap-3 text-left">
              <input type="text" required value={customOrder.name} placeholder={copy.customOrders.namePlaceholder}
                     onChange={(e) => setCustomOrder((c) => ({ ...c, name: e.target.value }))}
                     className={`${prose} rounded-full px-5 py-3 text-lg text-merrbakes-brown bg-white border border-merrbakes-brown/20 outline-none focus:ring-4 focus:ring-merrbakes-yellow`} />
              <input type="email" required value={customOrder.email} placeholder={copy.customOrders.emailPlaceholder}
                     onChange={(e) => setCustomOrder((c) => ({ ...c, email: e.target.value }))}
                     className={`${prose} rounded-full px-5 py-3 text-lg text-merrbakes-brown bg-white border border-merrbakes-brown/20 outline-none focus:ring-4 focus:ring-merrbakes-yellow`} />
              <textarea required value={customOrder.message} placeholder={copy.customOrders.messagePlaceholder} rows={3}
                        onChange={(e) => setCustomOrder((c) => ({ ...c, message: e.target.value }))}
                        className={`${prose} rounded-3xl px-5 py-3 text-lg text-merrbakes-brown bg-white border border-merrbakes-brown/20 outline-none focus:ring-4 focus:ring-merrbakes-yellow resize-none`} />
              <button type="submit" disabled={customOrderStatus === "sending"}
                      className="inline-flex items-center justify-center gap-2 bg-merrbakes-berry text-white rounded-full px-6 py-3 text-xl font-bold hover:opacity-85 transition shadow-sm disabled:opacity-60">
                {customOrderStatus === "sending" ? copy.customOrders.submittingLabel : copy.customOrders.submitLabel}
              </button>
              {customOrderStatus === "error" && (
                <p className={`${prose} text-merrbakes-berry text-base`}>{copy.customOrders.errorMessage}</p>
              )}
            </form>
          )}

          <a href={copy.customOrders.secondaryHref} target="_blank" rel="noreferrer"
             className={`${prose} inline-block text-base font-bold text-merrbakes-brown/60 hover:text-merrbakes-berry underline mt-5`}>
            {copy.customOrders.secondaryLabel}
          </a>
        </div>
      </section>

      {/* FOOTER */}
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
