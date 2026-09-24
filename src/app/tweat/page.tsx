"use client";
// /tweat — Tweat of the Week Club: pick a level (live from Notion), sign up via
// Stripe Checkout (/api/subscribe), or manage an existing membership through
// Stripe's customer portal (/api/tweat/manage). Copy lives in src/content/tweat.ts.
import { useState, useEffect, FormEvent } from "react";
import Image from "next/image";
import { tweatCopy as copy } from "@/content/tweat";
import StorefrontHeader from "@/components/StorefrontHeader";

type Level = { variantId: string; name: string; price: string; tweats: number | null; isDefault: boolean };
type Club = { name: string; description: string; photoUrl: string | null; levels: Level[]; firstBoxCutoff: string; firstWeeklyCharge: string };

const prose = "font-sans";
const btnPrimary =
  "inline-flex items-center justify-center gap-2 bg-merrbakes-berry text-white rounded-full px-6 py-3 text-xl font-bold hover:opacity-85 transition shadow-sm disabled:opacity-60";
const HOME = "/";
const home = (href: string) => (href.startsWith("#") ? HOME + href : href);

function formatDay(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { timeZone: "America/Chicago", weekday: "long", month: "long", day: "numeric" }).toLowerCase();
}

export default function TweatPage() {
  // undefined = loading, null = unavailable
  const [club, setClub] = useState<Club | null | undefined>(undefined);
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/tweat", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((d: Club | null) => {
        const ok = d && Array.isArray(d.levels) && d.levels.length > 0;
        setClub(ok ? d : null);
        if (ok) setSelected((d.levels.find((l) => l.isDefault) ?? d.levels[0]).variantId);
      })
      .catch(() => setClub(null));
  }, []);

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [error, setError] = useState("");
  async function subscribe(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId: selected, email }),
      });
      const d = await res.json();
      if (d.url) { window.location.href = d.url; return; }
      setError(d.error || copy.errorMessage);
    } catch {
      setError(copy.errorMessage);
    }
    setStatus("error");
  }

  return (
    <main className="min-h-screen bg-merrbakes-pink text-merrbakes-brown font-hand">
      <StorefrontHeader logoHref={HOME} ctaHref="/club" resolveHref={home} />

      <div className="max-w-4xl mx-auto px-5 py-16">
        {club === undefined ? (
          <div className="flex flex-col gap-4">
            <div className="h-6 w-40 rounded-full bg-white/60 animate-pulse" />
            <div className="h-12 w-2/3 rounded-full bg-white/60 animate-pulse" />
            <div className="grid sm:grid-cols-3 gap-4 mt-6">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-44 rounded-3xl bg-white/60 animate-pulse" />)}
            </div>
          </div>
        ) : club === null ? (
          <p className={`${prose} text-xl text-center py-16`}>{copy.unavailable}</p>
        ) : (
          <>
            <div className="grid md:grid-cols-[1fr_auto] gap-8 items-start">
              <div>
                <div className="text-merrbakes-berry text-lg font-bold lowercase tracking-wide">{copy.eyebrow}</div>
                <h1 className="text-5xl font-black mt-1">{club.name}</h1>
                {club.description && (
                  <p className={`${prose} text-xl text-merrbakes-brown/80 mt-4 max-w-xl`}>{club.description.split(/\n\s*\n/)[0]}</p>
                )}
              </div>
              {club.photoUrl && (
                <div className="w-48 h-48 rounded-3xl overflow-hidden relative border border-merrbakes-brown/15 shadow-md">
                  <Image src={club.photoUrl} alt={club.name} fill sizes="192px" className="object-cover" />
                </div>
              )}
            </div>

            <form onSubmit={subscribe} className="mt-10">
              <h2 className="text-3xl font-black">{copy.pickLevel}</h2>
              <div className="grid sm:grid-cols-3 gap-4 mt-4" role="radiogroup">
                {club.levels.map((l) => (
                  <button key={l.variantId} type="button" role="radio" aria-checked={selected === l.variantId}
                          onClick={() => setSelected(l.variantId)}
                          className={`text-left rounded-3xl p-5 border-4 transition bg-white ${selected === l.variantId ? "border-merrbakes-berry shadow-md" : "border-transparent hover:border-merrbakes-berry/40"}`}>
                    <div className="text-2xl font-black">{l.name}</div>
                    <div className="text-3xl font-black text-merrbakes-berry mt-2">{l.price} <span className="text-lg text-merrbakes-brown/60">{copy.perWeek}</span></div>
                    {l.tweats != null && <div className={`${prose} text-base mt-2`}>{copy.tweatsPerWeek(l.tweats)}</div>}
                  </button>
                ))}
              </div>
              <p className={`${prose} text-base text-merrbakes-brown/70 mt-3`}>{copy.levelNote}</p>

              <ul className={`${prose} mt-6 flex flex-col gap-1.5 text-lg list-disc pl-5`}>
                {copy.howItWorks.map((line) => <li key={line}>{line}</li>)}
              </ul>

              <div className="mt-7 flex flex-col sm:flex-row gap-3 max-w-xl">
                <input type="email" value={email} placeholder={copy.emailPlaceholder} aria-label={copy.emailLabel} autoComplete="email"
                       onChange={(e) => setEmail(e.target.value)}
                       className={`${prose} flex-1 rounded-full px-5 py-3 text-lg bg-white border border-merrbakes-brown/20 outline-none focus:ring-4 focus:ring-merrbakes-yellow`} />
                <button type="submit" disabled={status === "sending" || !selected} className={btnPrimary}>
                  {status === "sending" ? copy.submittingLabel : copy.submitLabel}
                </button>
              </div>
              <p className={`${prose} text-base font-semibold mt-3`}>
                {copy.firstCharge(club.levels.find((l) => l.variantId === selected)?.price ?? "", formatDay(club.firstBoxCutoff), formatDay(club.firstWeeklyCharge))}
              </p>
              {status === "error" && <p className={`${prose} text-merrbakes-berry text-base mt-2`}>{error}</p>}
            </form>

            <div className="mt-14 rounded-3xl bg-white/70 border border-merrbakes-brown/15 p-6">
              <h2 className="text-2xl font-black">{copy.manage.heading}</h2>
              <p className={`${prose} text-lg mt-1`}>{copy.manage.body}</p>
              <a href="/api/tweat/manage" className="inline-block mt-3 text-xl font-bold text-merrbakes-berry hover:underline">{copy.manage.linkLabel}</a>
            </div>
          </>
        )}
      </div>

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
