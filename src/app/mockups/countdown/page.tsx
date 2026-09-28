"use client";
// MOCKUP ONLY (local dev) — every countdown style side by side on the banner's brown,
// for the owner to pick one. 404s in production.
import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { Countdown, clockStyles } from "@/components/SpecialBanner";

const names = { tiles: "A — tiles (current)", text: "B — plain text", flip: "C — clock digits", pill: "D — single pill", outline: "E — outlined boxes" };

export default function CountdownMockups() {
  if (process.env.NODE_ENV === "production") notFound();
  // fixed sample: 17 days 9 hrs 54 min from page load, ticking
  const [end] = useState(() => Date.now() + ((17 * 24 + 9) * 60 + 54) * 60_000 + 45_000);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  return (
    <main className="min-h-screen bg-merrbakes-brown text-merrbakes-pink font-hand p-10 flex flex-col gap-8">
      {clockStyles.map((style) => (
        <div key={style}>
          <div className="text-merrbakes-yellow text-lg font-bold mb-2">{names[style]}</div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="text-xl font-bold">preorders close in</span>
            <Countdown ms={end - now} style={style} />
            <span className="font-sans text-sm text-merrbakes-pink/70">until thu, oct 15</span>
          </div>
        </div>
      ))}
    </main>
  );
}
