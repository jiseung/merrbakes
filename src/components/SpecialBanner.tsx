"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { specialCopy as copy } from "@/content/special";
import { DropItem, Variant, displayName, slugify } from "@/lib/shopItems";

const prose = "font-sans";
const btnPrimary =
  "inline-flex items-center gap-2 bg-merrbakes-berry text-white rounded-full px-6 py-3 text-xl font-bold hover:opacity-85 transition shadow-sm";

// Limited-time specials (Notion: "Limited special" ticked, Hide unticked), on the homepage
// and /shop. Counts down to "Orders close"; after that the item shows as sold out
// (no add button) until Merr ticks Hide. Checkout refuses it after close too.
// Mockup aid: ?special=soldout (local dev only) previews the sold-out state.
export default function SpecialBanner({ items, variants, variantsLoaded, onAdd }: {
  items: DropItem[];
  variants: Variant[];
  variantsLoaded: boolean;
  onAdd: (item: DropItem) => boolean | void;
}) {
  // ticks every second for the countdown; also flips an item to sold out the moment it closes
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const [previewSoldOut, setPreviewSoldOut] = useState(false);
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") setPreviewSoldOut(new URLSearchParams(window.location.search).get("special") === "soldout");
  }, []);
  const [added, setAdded] = useState<string | null>(null);

  if (items.length === 0) return null;

  return (
    <section id="special" className="bg-merrbakes-brown text-merrbakes-pink">
      <div className="max-w-6xl mx-auto px-5 py-14 flex flex-col gap-14">
        {items.map((it) => {
          const itemVariants = variants.filter((v) => v.shopItemId === it.id);
          const variant = itemVariants.find((v) => v.isDefault) ?? itemVariants[0];
          const price = variant?.price ?? it.price;
          const closes = it.ordersClose ? new Date(it.ordersClose) : null;
          const soldOut = previewSoldOut || it.closed || (!!closes && closes.getTime() <= now);
          // a date-only close is midnight *after* that day, so step back a second to label the day itself
          const closesLabel = closes && new Date(closes.getTime() - 1000)
            .toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "America/Chicago" }).toLowerCase();
          return (
            <div key={it.id ?? it.name}>
              {closes && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-8">
                  {soldOut ? (
                    <span className="text-xl font-bold">{copy.closedPrefix} {closesLabel}</span>
                  ) : (
                    <>
                      <span className="text-xl font-bold">{copy.countdownLabel}</span>
                      <Countdown ms={closes.getTime() - now} />
                      <span className={`${prose} text-sm text-merrbakes-pink/70`}>{copy.closesPrefix} {closesLabel}</span>
                    </>
                  )}
                </div>
              )}
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <Link href={`/shop/${slugify(it.name)}`}
                    className="block bg-white rounded-3xl p-4 border border-merrbakes-brown/15 shadow-xl hover:shadow-2xl transition max-w-md w-full mx-auto"
                    style={{ transform: "rotate(-2deg)" }}>
                <div className="aspect-square rounded-2xl relative overflow-hidden bg-merrbakes-yellow">
                  {it.photoUrl
                    ? <Image src={it.photoUrl} alt={it.name} fill sizes="(max-width: 768px) 90vw, 450px" className={`object-cover ${soldOut ? "grayscale opacity-70" : ""}`} />
                    : <div className="absolute inset-0 grid place-items-center text-7xl">{it.icon ?? "🎃"}</div>}
                  {soldOut && (
                    <div className="absolute inset-0 grid place-items-center">
                      <span className="bg-merrbakes-berry text-white text-4xl font-black rounded-2xl px-6 py-2 shadow-lg" style={{ transform: "rotate(-8deg)" }}>
                        {copy.soldOut}
                      </span>
                    </div>
                  )}
                </div>
              </Link>

              <div>
                <div className="flex flex-wrap gap-2 text-base font-bold">
                  <span className="bg-merrbakes-yellow text-merrbakes-brown rounded-full px-3 py-1">{soldOut ? copy.soldOut : copy.eyebrow}</span>
                </div>
                <h2 className="text-5xl font-black mt-4 text-merrbakes-yellow text-balance">{displayName(it.name)}</h2>
                {it.description && (
                  <p className={`${prose} text-lg text-merrbakes-pink/85 mt-4 whitespace-pre-line`}>{it.description}</p>
                )}

                <div className="flex flex-wrap items-center gap-5 mt-6">
                  <span className={`text-4xl font-black text-merrbakes-yellow ${soldOut ? "line-through opacity-60" : ""}`}>{price}</span>
                  {soldOut ? (
                    <span className="inline-flex items-center rounded-full px-6 py-3 text-xl font-bold border-2 border-merrbakes-pink/40 text-merrbakes-pink/70">{copy.soldOut}</span>
                  ) : (
                    <button type="button"
                            onClick={() => { if (onAdd(it)) { setAdded(it.name); setTimeout(() => setAdded(null), 1500); } }}
                            disabled={!variant}
                            className={`${btnPrimary} disabled:opacity-60 ${variantsLoaded ? "disabled:cursor-not-allowed" : "disabled:animate-pulse disabled:cursor-wait"}`}>
                      {added === it.name ? copy.addedButtonLabel : copy.addButtonLabel}
                    </button>
                  )}
                </div>
              </div>
            </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// days / hrs / min / sec, as small inline tiles
function Countdown({ ms }: { ms: number }) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const parts: [number, string][] = [
    [Math.floor(total / 86400), copy.countdownUnits.days],
    [Math.floor((total % 86400) / 3600), copy.countdownUnits.hours],
    [Math.floor((total % 3600) / 60), copy.countdownUnits.minutes],
    [total % 60, copy.countdownUnits.seconds],
  ];
  return (
    <div className="flex gap-1.5" role="timer">
      {parts.map(([n, unit]) => (
        <div key={unit} className="bg-merrbakes-pink text-merrbakes-brown rounded-xl px-2.5 py-1 flex items-baseline gap-1">
          <span className="text-2xl font-black tabular-nums leading-none">{String(n).padStart(2, "0")}</span>
          <span className="text-sm font-bold">{unit}</span>
        </div>
      ))}
    </div>
  );
}
