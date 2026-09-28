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
export default function SpecialBanner({ items, variants, variantsLoaded, onAdd, compact = false, clockStyle = "tiles" }: {
  items: DropItem[];
  variants: Variant[];
  variantsLoaded: boolean;
  onAdd: (item: DropItem) => boolean | void;
  compact?: boolean;
  clockStyle?: ClockStyle;
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
      <div className={`max-w-6xl mx-auto px-5 flex flex-col ${compact ? "py-4 gap-4" : "py-14 gap-14"}`}>
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

          const clockRow = closes && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {soldOut ? (
                <span className={`${compact ? "text-lg" : "text-xl"} font-bold`}>{copy.closedPrefix} {closesLabel}</span>
              ) : (
                <>
                  <span className={`${compact ? "text-lg" : "text-xl"} font-bold`}>{copy.countdownLabel}</span>
                  <Countdown ms={closes.getTime() - now} style={clockStyle} small={compact} />
                  <span className={`${prose} text-sm text-merrbakes-pink/70`}>{copy.closesPrefix} {closesLabel}</span>
                </>
              )}
            </div>
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
              <span className={`${compact ? "text-3xl" : "text-4xl"} font-black text-merrbakes-yellow ${soldOut ? "line-through opacity-60" : ""}`}>{price}</span>
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
            // one row: photo | pill + name + countdown | price + button; capped at 20vh on md+
            return (
              <div key={it.id ?? it.name} className="flex flex-wrap md:flex-nowrap items-center gap-x-6 gap-y-3 md:max-h-[20vh]">
                <Link href={href} aria-label={it.name}
                      className="relative shrink-0 aspect-square h-20 md:h-[calc(20vh-2rem)] max-h-36 rounded-2xl overflow-hidden border-4 border-white shadow-lg bg-merrbakes-yellow"
                      style={{ transform: "rotate(-2deg)" }}>
                  {photo}
                </Link>
                <div className="min-w-0 flex-1 flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-3">
                    {pill}
                    <Link href={href} className="text-3xl font-black text-merrbakes-yellow leading-tight hover:underline">{displayName(it.name)}</Link>
                  </div>
                  {clockRow}
                </div>
                <div className="shrink-0">{buy}</div>
              </div>
            );
          }

          return (
            <div key={it.id ?? it.name}>
              {clockRow && <div className="mb-8">{clockRow}</div>}
              <div className="grid md:grid-cols-2 gap-10 items-center">
                <Link href={href}
                      className="block bg-white rounded-3xl p-4 border border-merrbakes-brown/15 shadow-xl hover:shadow-2xl transition max-w-md w-full mx-auto"
                      style={{ transform: "rotate(-2deg)" }}>
                  <div className="aspect-square rounded-2xl relative overflow-hidden bg-merrbakes-yellow">{photo}</div>
                </Link>
                <div>
                  <div className="flex flex-wrap gap-2">{pill}</div>
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

// Countdown styles (owner is choosing; preview them all at /mockups/countdown in local dev).
export type ClockStyle = "tiles" | "text" | "flip" | "pill" | "outline";
export const clockStyles: ClockStyle[] = ["tiles", "text", "flip", "pill", "outline"];

export function Countdown({ ms, style = "tiles", small = false }: { ms: number; style?: ClockStyle; small?: boolean }) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400), h = Math.floor((total % 86400) / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  const u = copy.countdownUnits;
  const parts: [number, string][] = [[d, u.days], [h, u.hours], [m, u.minutes], [s, u.seconds]];
  const num = small ? "text-xl" : "text-2xl";

  if (style === "text") {
    // plain numbers in the headline yellow, no boxes
    return (
      <div role="timer" className={`${small ? "text-2xl" : "text-3xl"} font-black text-merrbakes-yellow tabular-nums`}>
        {parts.map(([n, unit]) => (
          <span key={unit} className="mr-2.5">{pad(n)}<span className="text-base font-bold text-merrbakes-pink/80 ml-0.5">{unit[0]}</span></span>
        ))}
      </div>
    );
  }
  if (style === "flip") {
    // dark clock digits with colons, tiny labels underneath
    return (
      <div role="timer" className="flex items-start gap-1">
        {parts.map(([n, unit], i) => (
          <div key={unit} className="flex items-start gap-1">
            {i > 0 && <span className={`${num} font-black text-merrbakes-yellow/70 leading-9`}>:</span>}
            <div className="flex flex-col items-center">
              <span className={`bg-black/30 text-merrbakes-yellow rounded-lg px-2 ${num} font-black tabular-nums leading-9`}>{pad(n)}</span>
              <span className="text-xs font-bold text-merrbakes-pink/70 mt-0.5">{unit}</span>
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (style === "pill") {
    // one berry badge: "17 days 09:54:45"
    return (
      <span role="timer" className={`inline-flex items-center gap-2 bg-merrbakes-berry text-white rounded-full px-4 py-1 ${small ? "text-lg" : "text-xl"} font-black tabular-nums`}>
        ⏳ {d} {u.days} {pad(h)}:{pad(m)}:{pad(s)}
      </span>
    );
  }
  if (style === "outline") {
    // transparent boxes with a pink outline
    return (
      <div role="timer" className="flex gap-1.5">
        {parts.map(([n, unit]) => (
          <div key={unit} className="border-2 border-merrbakes-pink/60 rounded-xl px-2.5 py-0.5 flex items-baseline gap-1">
            <span className={`${num} font-black tabular-nums text-merrbakes-pink`}>{pad(n)}</span>
            <span className="text-sm font-bold text-merrbakes-pink/70">{unit}</span>
          </div>
        ))}
      </div>
    );
  }
  // tiles: small pink tiles, number + unit
  return (
    <div role="timer" className="flex gap-1.5">
      {parts.map(([n, unit]) => (
        <div key={unit} className="bg-merrbakes-pink text-merrbakes-brown rounded-xl px-2.5 py-1 flex items-baseline gap-1">
          <span className={`${num} font-black tabular-nums leading-none`}>{pad(n)}</span>
          <span className="text-sm font-bold">{unit}</span>
        </div>
      ))}
    </div>
  );
}
