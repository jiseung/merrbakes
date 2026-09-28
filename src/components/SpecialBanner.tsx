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
// Full layout on the homepage; `compact` on /shop (one row, no description, ≤20vh).
// Mockup aid: ?special=soldout (local dev only) previews the sold-out state.
export default function SpecialBanner({ items, variants, variantsLoaded, onAdd, compact = false }: {
  items: DropItem[];
  variants: Variant[];
  variantsLoaded: boolean;
  onAdd: (item: DropItem) => boolean | void;
  compact?: boolean;
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
      <div className={`max-w-6xl mx-auto px-5 flex flex-col ${compact ? "py-4 gap-4 md:px-12" : "py-14 gap-14"}`}>
        {items.map((it) => {
          const itemVariants = variants.filter((v) => v.shopItemId === it.id);
          const variant = itemVariants.find((v) => v.isDefault) ?? itemVariants[0];
          const price = variant?.price ?? it.price;
          const closes = it.ordersClose ? new Date(it.ordersClose) : null;
          const soldOut = previewSoldOut || it.closed || (!!closes && closes.getTime() <= now);
          // a date-only close is midnight *after* that day, so step back a second to label the day itself
          const closesLabel = closes && new Date(closes.getTime() - 1000)
            .toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "America/Chicago" }).toLowerCase();
          const href = `/shop/${slugify(it.name)}`;

          // countdown + "left"; after close, the closed date instead
          const clockRow = closes && (
            soldOut
              ? <span className={`${compact ? "text-lg" : "text-xl"} font-bold`}>{copy.closedPrefix} {closesLabel}</span>
              : (
                <div className="flex items-center gap-2.5">
                  <Countdown ms={closes.getTime() - now} small={compact} />
                  <span className={`${compact ? "text-lg" : "text-xl"} font-bold`}>{copy.countdownSuffix}</span>
                </div>
              )
          );

          const photo = (
            <>
              {it.photoUrl
                ? <Image src={it.photoUrl} alt={it.name} fill sizes={compact ? "160px" : "(max-width: 768px) 90vw, 450px"} className={`object-cover ${soldOut ? "grayscale opacity-70" : ""}`} />
                : <div className={`absolute inset-0 grid place-items-center ${compact ? "text-4xl" : "text-7xl"}`}>{it.icon ?? "🎃"}</div>}
              {soldOut && (
                <div className="absolute inset-0 grid place-items-center">
                  <span className={`bg-merrbakes-berry text-white font-black shadow-lg ${compact ? "text-base rounded-lg px-2 py-0.5" : "text-4xl rounded-2xl px-6 py-2"}`} style={{ transform: "rotate(-8deg)" }}>
                    {copy.soldOut}
                  </span>
                </div>
              )}
            </>
          );

          const buy = (
            <div className="flex flex-wrap items-center gap-4">
              {!compact && <span className={`text-4xl font-black text-merrbakes-yellow ${soldOut ? "line-through opacity-60" : ""}`}>{price}</span>}
              {soldOut ? (
                <span className={`inline-flex items-center rounded-full font-bold border-2 border-merrbakes-pink/40 text-merrbakes-pink/70 ${compact ? "px-5 py-2 text-lg" : "px-6 py-3 text-xl"}`}>{copy.soldOut}</span>
              ) : (
                <button type="button"
                        onClick={() => { if (onAdd(it)) { setAdded(it.name); setTimeout(() => setAdded(null), 1500); } }}
                        disabled={!variant}
                        className={`${btnPrimary} ${compact ? "!px-5 !py-2 !text-lg" : ""} disabled:opacity-60 ${variantsLoaded ? "disabled:cursor-not-allowed" : "disabled:animate-pulse disabled:cursor-wait"}`}>
                  {added === it.name ? copy.addedButtonLabel : copy.addButtonLabel}
                </button>
              )}
            </div>
          );

          const pill = (
            <span className={`bg-merrbakes-yellow text-merrbakes-brown rounded-full font-bold ${compact ? "text-sm px-2.5 py-0.5" : "text-base px-3 py-1"}`}>{soldOut ? copy.soldOut : copy.eyebrow}</span>
          );

          if (compact) {
            // one centered row: photo | pill + countdown, name | add button; capped at 20vh on md+
            return (
              <div key={it.id ?? it.name} className="flex flex-wrap md:flex-nowrap items-center justify-center gap-x-8 gap-y-3 md:max-h-[20vh]">
                <Link href={href} aria-label={it.name}
                      className="relative shrink-0 aspect-square h-20 md:h-[calc(20vh-2rem)] max-h-36 rounded-2xl overflow-hidden border-4 border-white shadow-lg bg-merrbakes-yellow"
                      style={{ transform: "rotate(-2deg)" }}>
                  {photo}
                </Link>
                <div className="min-w-0 flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-3">
                    {pill}
                    {clockRow}
                  </div>
                  <Link href={href} className="text-3xl font-black text-merrbakes-yellow leading-tight hover:underline">{displayName(it.name)}</Link>
                </div>
                <div className="shrink-0">{buy}</div>
              </div>
            );
          }

          return (
            <div key={it.id ?? it.name}>
              <div className="grid md:grid-cols-2 gap-10 items-center">
                <Link href={href}
                      className="block bg-white rounded-3xl p-4 border border-merrbakes-brown/15 shadow-xl hover:shadow-2xl transition max-w-md w-full mx-auto"
                      style={{ transform: "rotate(-2deg)" }}>
                  <div className="aspect-square rounded-2xl relative overflow-hidden bg-merrbakes-yellow">{photo}</div>
                </Link>
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    {pill}
                    {clockRow}
                  </div>
                  <h2 className="text-5xl font-black mt-4 text-merrbakes-yellow text-balance">{displayName(it.name)}</h2>
                  {it.description && (
                    <p className={`${prose} text-lg text-merrbakes-pink/85 mt-4 whitespace-pre-line`}>{it.description}</p>
                  )}
                  <div className="mt-6">{buy}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// days : hrs : min : sec as dark clock digits, each unit labelled inside its box
function Countdown({ ms, small = false }: { ms: number; small?: boolean }) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const u = copy.countdownUnits;
  const parts: [number, string][] = [
    [Math.floor(total / 86400), u.days],
    [Math.floor((total % 86400) / 3600), u.hours],
    [Math.floor((total % 3600) / 60), u.minutes],
    [total % 60, u.seconds],
  ];
  return (
    <div role="timer" aria-label={parts.map(([n, unit]) => `${n} ${unit}`).join(" ")} className="flex items-center gap-1">
      {parts.map(([n, unit], i) => (
        <div key={unit} className="flex items-center gap-1">
          {i > 0 && <span className={`${small ? "text-xl" : "text-2xl"} font-black text-merrbakes-yellow/70`}>:</span>}
          <div className={`bg-black/30 rounded-lg flex flex-col items-center ${small ? "px-2 py-0.5 min-w-11" : "px-2.5 py-1 min-w-14"}`}>
            <span className={`${small ? "text-xl" : "text-3xl"} font-black text-merrbakes-yellow tabular-nums leading-tight`}>{String(n).padStart(2, "0")}</span>
            <span className="text-[0.65rem] font-bold text-merrbakes-pink/70 leading-none pb-0.5">{unit}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
