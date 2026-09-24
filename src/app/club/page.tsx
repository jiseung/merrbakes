"use client";
// /club — a dedicated membership landing page. The nav is pulled verbatim from
// option16, and this page owns the only tier-pricing cards site-wide (option16's
// club section links here instead of duplicating them). The rest of the page
// (how it works, benefits, faq) lives in content/club.ts — the final section is
// option16's own email lead magnet, verbatim (copy + behavior), not a club-specific one.
import { useEffect, useState } from "react";
import Image from "next/image";
import { clubCopy as copy } from "@/content/club";
import { option16Copy } from "@/content/option16";
import StorefrontHeader from "@/components/StorefrontHeader";

const prose = "font-sans";
const eyebrow = "text-merrbakes-berry text-lg font-bold lowercase tracking-wide";
const h2 = "text-4xl font-black mt-1";

// 5-pointed star path, points up, centered at (cx, cy) — same helper option16's
// ABOUT section uses for its sprinkle field, duplicated here since it's a small,
// self-contained function and the two pages don't share a ui-helpers module.
function star5(cx: number, cy: number, rOuter: number, rInner: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const angle = (-90 + i * 36) * (Math.PI / 180);
    const r = i % 2 === 0 ? rOuter : rInner;
    const x = (cx + r * Math.cos(angle)).toFixed(2);
    const y = (cy + r * Math.sin(angle)).toFixed(2);
    pts.push(`${x},${y}`);
  }
  return `M${pts[0]} L${pts.slice(1).join(" L")} Z`;
}

// storefront anchors (#drop etc.) live on the homepage (/), not this page
const HOME = "/";
const home = (href: string) => (href.startsWith("#") ? HOME + href : href);

// Loose match for tying a live Notion row back to its static tier — handles the
// curly vs. straight apostrophe difference between Notion ("Confectioner’s Club")
// and this file ("Confectioner's Club") along with case/whitespace.
const normalizeName = (s: string) => s.toLowerCase().replace(/['’]/g, "'").trim();

export default function ClubPage() {
  // tier cards — perks/featured copy stays static (Notion has no data for those
  // yet), but price is live from the Shop Items db (Type = Recurring), matched
  // back to a static tier by name. Starts from the static fallback so the cards
  // aren't empty before the fetch resolves — same pattern as option16's sections.
  const [tiers, setTiers] = useState(copy.hero.tiers);
  // price is the only field that's actually live-fetched (name/perks/featured have
  // no Notion equivalent yet, so those are real static copy, not placeholders) —
  // show a loading placeholder just for the number rather than a possibly-stale
  // hardcoded price while the fetch is in flight.
  const [priceLoaded, setPriceLoaded] = useState(false);
  useEffect(() => {
    fetch("/api/notion-shop?type=recurring", { cache: "no-store" })
      .then((res) => res.json())
      .then((d) => {
        if (Array.isArray(d.data) && d.data.length > 0) {
          setTiers((prev) =>
            prev.map((t) => {
              const live = d.data.find((row: any) => normalizeName(row.name) === normalizeName(t.name));
              return live?.price ? { ...t, price: live.price } : t;
            })
          );
        }
      })
      .finally(() => setPriceLoaded(true));
  }, []);

  // mailing-list lead magnet — same copy/behavior as option16's, wired to the
  // same real /api/join endpoint.
  const [email, setEmail] = useState("");
  const [sendRecipe, setSendRecipe] = useState(true);
  const [joined, setJoined] = useState(false);
  const [err, setErr] = useState("");
  async function join() {
    if (!email || email.indexOf("@") < 1) { setErr(option16Copy.emailMagnet.errorBadEmail); return; }
    setErr("");
    try {
      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) setJoined(true);
      else setErr(option16Copy.emailMagnet.errorSubmitFailed);
    } catch {
      setErr(option16Copy.emailMagnet.errorSubmitFailed);
    }
  }

  return (
    <main className="min-h-screen bg-merrbakes-pink text-merrbakes-brown font-hand">
      {/* NAV — identical to option16 */}
      <StorefrontHeader logoHref={HOME} ctaHref="#tiers" resolveHref={home} sprinkleBg />

      {/* HERO — option16's sprinkle-field background (from its ABOUT section), applied
          behind this page's own tiers content rather than option16's bio/photo.
          No top-of-section wave here — the nav above is the same yellow sprinkle
          field now (StorefrontHeader's sprinkleBg prop), so it's one continuous field. */}
      <section id="tiers" className="relative bg-merrbakes-yellow overflow-hidden">
        <svg
          className="absolute inset-0 z-0 w-full h-full"
          style={{ maskImage: "radial-gradient(ellipse at center, transparent 32%, black 70%)", WebkitMaskImage: "radial-gradient(ellipse at center, transparent 32%, black 70%)" }}
          aria-hidden
        >
          <defs>
            <pattern id="sprinkles-club" width="221" height="221" patternUnits="userSpaceOnUse">
              <g fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d={star5(33.84, 33.84, 9.5, 4)} fill="#67DFB9" stroke="#67DFB9" strokeWidth="2.2" />
                <path d={star5(161.29, 57.17, 9.5, 4)} fill="#ffffff" stroke="#ffffff" strokeWidth="2.2" />
                <path d={star5(80.62, 127.44, 9.5, 4)} fill="#E15C7C" stroke="#E15C7C" strokeWidth="2.2" />
                <path d={star5(197.58, 179.46, 9.5, 4)} fill="#67DFB9" stroke="#67DFB9" strokeWidth="2.2" />
                <path d={star5(20.74, 189.8, 9.5, 4)} fill="#ffffff" stroke="#ffffff" strokeWidth="2.2" />
                <rect x="92.36" y="20.74" width="5" height="18" rx="2.5" fill="#765C4B" transform="rotate(20 95.58 32.48)" />
                <rect x="14.32" y="88.4" width="5" height="18" rx="2.5" fill="#E15C7C" transform="rotate(-15 17.53 100.13)" />
                <rect x="128.68" y="101.37" width="5" height="18" rx="2.5" fill="#765C4B" transform="rotate(35 132.01 113.13)" />
                <rect x="180.79" y="23.46" width="5" height="18" rx="2.5" fill="#F4A7BE" transform="rotate(-25 184.01 35.07)" />
                <rect x="115.71" y="166.46" width="5" height="18" rx="2.5" fill="#765C4B" transform="rotate(10 118.92 178.09)" />
                <rect x="50.76" y="192.41" width="5" height="18" rx="2.5" fill="#67DFB9" transform="rotate(-30 53.96 204.16)" />
              </g>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#sprinkles-club)" />
        </svg>
        <div className="relative z-10 max-w-6xl mx-auto px-5 pt-10 pb-16">
        <div className="text-center max-w-2xl mx-auto mb-10 bg-merrbakes-yellow rounded-3xl py-4">
          <div className={eyebrow}>{copy.hero.eyebrow}</div>
          <h1 className={`${h2} text-merrbakes-berry`}>{copy.hero.heading}</h1>
          <p className={`${prose} text-xl text-merrbakes-brown/75 mt-3`}>{copy.hero.subhead}</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {tiers.map((t) => (
            <div key={t.name} className={`bg-white rounded-3xl p-6 shadow-sm relative flex flex-col h-full ${t.featured ? "border-2 border-merrbakes-brown md:-translate-y-2 shadow-md" : "border border-merrbakes-brown/15"}`}>
              {t.featured && <span className="absolute -top-3.5 left-6 bg-merrbakes-berry text-white text-sm font-bold rounded-full px-3 py-1">{copy.hero.featuredBadge}</span>}
              {t.isNew && <span className="absolute -top-3.5 right-6 bg-merrbakes-green text-merrbakes-brown text-sm font-bold rounded-full px-3 py-1">{copy.hero.newBadge}</span>}
              <div className="text-3xl font-bold text-center">{t.name}</div>
              <div className="text-4xl font-black mt-2 flex items-center justify-center gap-2">
                {priceLoaded ? (
                  <>{t.price}<span className="text-xl font-bold text-merrbakes-brown/60">/{t.billing ?? "mo"}</span></>
                ) : (
                  <span className="inline-block h-10 w-20 rounded-full bg-merrbakes-pink/50 animate-pulse" />
                )}
              </div>
              <ul className={`${prose} mt-4 mb-6 flex-1 flex flex-col gap-2 text-lg text-merrbakes-brown/75`}>
                {t.perks.map((p) => <li key={p} className="flex gap-2"><span>🍪</span>{p}</li>)}
              </ul>
              {/* weekly club signs up on merrbakes.com (/tweat, Stripe); the monthly
                  clubs are Ko-fi memberships */}
              <a href={t.billing === "wk" ? "/tweat" : "https://ko-fi.com/merrbakes"}
                 {...(t.billing === "wk" ? {} : { target: "_blank", rel: "noreferrer" })}
                 className={`block text-center rounded-full py-3 text-xl font-bold transition ${t.featured ? "bg-merrbakes-berry text-white hover:opacity-85" : "bg-white text-merrbakes-brown border-2 border-merrbakes-brown/60 hover:border-merrbakes-berry"}`}>
                join {t.name.replace(" Club", "")}
              </a>
            </div>
          ))}
        </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="bg-white/70 border-y border-merrbakes-brown/15">
        <div className="max-w-6xl mx-auto px-5 py-16">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className={eyebrow}>{copy.how.eyebrow}</div>
            <h2 className={h2}>{copy.how.heading}</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {copy.how.steps.map((s, i) => (
              <div key={s.title} className="bg-white rounded-3xl p-6 border border-merrbakes-brown/15 shadow-sm text-center">
                <div className="mx-auto w-16 h-16 rounded-full grid place-items-center text-4xl bg-merrbakes-pink relative">
                  {s.icon}
                  <span className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-merrbakes-berry text-white text-base font-black grid place-items-center">{i + 1}</span>
                </div>
                <div className="text-2xl font-bold mt-4">{s.title}</div>
                <p className={`${prose} text-merrbakes-brown/75 text-lg mt-2`}>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="bg-merrbakes-brown">
        <div className="max-w-6xl mx-auto px-5 py-16">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="text-merrbakes-yellow text-lg font-bold lowercase tracking-wide">{copy.benefits.eyebrow}</div>
            <h2 className={`${h2} text-white`}>{copy.benefits.heading}</h2>
          </div>
          <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-merrbakes-brown/15 shadow-sm p-8 sm:p-10">
            <ul className="flex flex-col items-center text-center divide-y divide-merrbakes-brown/10">
              {copy.benefits.items.map((b) => (
                <li key={b.title} className="flex flex-col items-center py-5 first:pt-0 last:pb-0">
                  <div className="text-3xl">{b.icon}</div>
                  <div className="text-xl font-bold mt-1">{b.title}</div>
                  <p className={`${prose} text-merrbakes-brown/75 text-base mt-1`}>{b.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-3xl mx-auto px-5 py-16">
        <div className="text-center mb-10">
          <div className={eyebrow}>{copy.faq.eyebrow}</div>
          <h2 className={h2}>{copy.faq.heading}</h2>
        </div>
        <div className="flex flex-col gap-3">
          {copy.faq.items.map((f) => (
            <details key={f.q} className="group bg-white rounded-2xl border border-merrbakes-brown/15 px-6 py-4 shadow-sm">
              <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-xl font-bold">
                {f.q}
                <span className="text-merrbakes-berry text-2xl leading-none transition-transform group-open:rotate-45">＋</span>
              </summary>
              <p className={`${prose} text-merrbakes-brown/75 text-lg mt-3`}>{f.a}</p>
              {f.link && (
                <a href={f.link.href} className={`${prose} inline-block text-merrbakes-berry font-bold text-lg mt-2 hover:underline`}>
                  {f.link.label}
                </a>
              )}
            </details>
          ))}
        </div>
      </section>

      {/* EMAIL LEAD MAGNET — same section as option16's, verbatim */}
      <section className="bg-gradient-to-br from-twitch-purple to-merrbakes-berry text-white">
        <div className="max-w-6xl mx-auto px-5 py-16 grid lg:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="text-4xl font-black mt-1 text-merrbakes-yellow">{option16Copy.emailMagnet.heading}</h2>
            <p className={`${prose} text-xl mt-3 opacity-90 max-w-lg`}>
              {option16Copy.emailMagnet.subhead}
            </p>
          </div>
          <div className="bg-white/10 border border-white/25 rounded-3xl p-6">
            {joined ? (
              <div className={`${prose} text-2xl text-white py-3`}>{option16Copy.emailMagnet.successMessage}</div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input id="ml" type="email" value={email} placeholder={option16Copy.emailMagnet.inputPlaceholder} autoComplete="email"
                         aria-label={option16Copy.emailMagnet.formLabel}
                         onChange={(e) => setEmail(e.target.value)}
                         className={`${prose} flex-1 rounded-full px-5 py-3 text-lg text-merrbakes-brown bg-white outline-none focus:ring-4 focus:ring-merrbakes-yellow`} />
                  <button type="button" onClick={join}
                          className="bg-merrbakes-yellow text-merrbakes-brown rounded-full px-6 py-3 text-xl font-bold hover:opacity-90 transition whitespace-nowrap">{option16Copy.emailMagnet.submitButton}</button>
                </div>
                <label className={`${prose} flex items-center gap-2 mt-3 text-base font-semibold text-white/90 cursor-pointer`}>
                  <input type="checkbox" checked={sendRecipe} onChange={(e) => setSendRecipe(e.target.checked)}
                         className="w-4 h-4 rounded accent-merrbakes-yellow" />
                  send me the recipe
                </label>
                <div className={`${prose} opacity-80 text-base mt-3`}>{err || option16Copy.emailMagnet.helperText}</div>
              </>
            )}
          </div>
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
