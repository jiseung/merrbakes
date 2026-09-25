"use client";
// Homepage (was /option16, "The Storefront" — moved to / on 2026-09-23)
// Ported from the concept redesign artifact: a conversion-first landing page
// (weekly menu, membership clubs, mailing-list lead magnet).
// Copy lives in src/content/option16.ts — edit that file for text changes.
import { useState, useEffect, CSSProperties, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { FaTwitch, FaDiscord, FaTiktok, FaInstagram, FaYoutube } from "react-icons/fa";
import { SiKofi } from "react-icons/si";
import { option16Copy as copy, Plate } from "@/content/option16";
import { DropItem, Variant, displayName, priceToCents, variantDisplayName, slugify } from "@/lib/shopItems";
import { ClubMenu } from "@/lib/clubItems";
import { CalendarMonth } from "@/lib/calendar";
import { formatMonth } from "@/lib/format";
import { useCart } from "@/lib/cart";
import StorefrontHeader from "@/components/StorefrontHeader";

function ThroneIcon() {
  return <Image src="/throne.png" alt="Throne" width={32} height={27} className="object-contain" />;
}
// order matches copy.about.socials (twitch, youtube, tiktok, instagram, discord, ko-fi, throne)
const aboutSocialIcons = [FaTwitch, FaYoutube, FaTiktok, FaInstagram, FaDiscord, SiKofi, ThroneIcon];

// circular social/support icon button with a name tag that pops up underneath on hover
function SocialButton({ href, ariaLabel, tooltip, className, children }: {
  href: string; ariaLabel: string; tooltip: string; className: string; children: ReactNode;
}) {
  return (
    <div className="relative group">
      <a href={href} target="_blank" rel="noreferrer" aria-label={ariaLabel} className={className}>
        {children}
      </a>
      <span
        className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-merrbakes-brown px-3 py-1 text-sm font-bold text-merrbakes-pink opacity-0 scale-95 transition group-hover:opacity-100 group-hover:scale-100">
        {tooltip}
      </span>
    </div>
  );
}

type HeroItem = { name: string; price: string; photoUrl: string | null; icon?: string; plate?: Plate };

const plates: Record<Plate, string> = {
  choc: "radial-gradient(circle at 32% 28%,#c98a5e,transparent 55%),linear-gradient(140deg,#6b4429,#4a2c17)",
  straw: "radial-gradient(circle at 30% 30%,#ffd9e2,transparent 55%),linear-gradient(140deg,#f5a9c0,#e06a92)",
  butter: "radial-gradient(circle at 30% 30%,#ffe9b0,transparent 55%),linear-gradient(140deg,#f0c869,#d99a3c)",
  matcha: "radial-gradient(circle at 30% 30%,#d7ecc4,transparent 55%),linear-gradient(140deg,#9cc47b,#5f9e6a)",
};

// 5-pointed star path, points up, centered at (cx, cy)
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

// thin highlighter-underline (matches the artifact's .under stripe, not a full box)
const hl: CSSProperties = { background: "linear-gradient(transparent 60%, #FFE99F 60%, #FFE99F 92%, transparent 92%)" };

// short UI text is handwritten (default font-hand); long prose uses a clean sans (like the artifact)
const prose = "font-sans";
const btnPrimary =
  "inline-flex items-center gap-2 bg-merrbakes-berry text-white rounded-full px-6 py-3 text-xl font-bold hover:opacity-85 transition shadow-sm";
const btnGhost =
  "inline-flex items-center gap-2 bg-white text-merrbakes-brown border-2 border-merrbakes-brown/60 rounded-full px-6 py-3 text-xl font-bold hover:border-merrbakes-berry transition";
const eyebrow = "text-merrbakes-berry text-lg font-bold lowercase tracking-wide";
const h2 = "text-4xl font-black mt-1";

export default function Home() {
  const { add } = useCart();

  // hero collage — live from Notion (Featured in hero). null = still loading
  // (skeleton cards); [] = loaded but nothing featured / fetch failed (collage hidden
  // rather than skeletons pulsing forever).
  const [heroItems, setHeroItems] = useState<HeroItem[] | null>(null);
  useEffect(() => {
    fetch("/api/notion-shop?hero=true", { cache: "no-store" })
      .then((res) => res.json())
      .then((d) => setHeroItems(Array.isArray(d.data) ? d.data : []))
      .catch(() => setHeroItems([]));
  }, []);

  // menu section — live from Notion (all Shop Items rows), capped to 8 rows here since
  // this is a teaser section (the "browse full menu" button links to /shop for the rest).
  // null = still loading (skeleton cards); [] = loaded but empty / fetch failed.
  const [menuItems, setMenuItems] = useState<DropItem[] | null>(null);
  useEffect(() => {
    fetch("/api/notion-shop", { cache: "no-store" })
      .then((res) => res.json())
      .then((d) => setMenuItems(Array.isArray(d.data) ? d.data : []))
      .catch(() => setMenuItems([]));
  }, []);

  // variants — needed so the menu grid's quick "add" button can add the right
  // priced SKU (an item's Default variant) instead of a flat item-level price.
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

  // club section's past-menu showcase — live from Notion ("merrbakes.com monthly menus").
  // null = still loading (skeleton tiles); [] = loaded but empty / fetch failed (grid hidden).
  const [pastMenus, setPastMenus] = useState<ClubMenu[] | null>(null);
  useEffect(() => {
    fetch("/api/notion-club", { cache: "no-store" })
      .then((res) => res.json())
      .then((d) => setPastMenus(Array.isArray(d.data) ? d.data : []))
      .catch(() => setPastMenus([]));
  }, []);

  // watch section's this-month calendar graphic — live from Notion ("merrbakes.com stream calendar").
  // undefined = still loading (skeleton block); null = loaded, no calendar (nothing rendered).
  const [calendar, setCalendar] = useState<CalendarMonth | null | undefined>(undefined);
  useEffect(() => {
    fetch("/api/notion-calendar", { cache: "no-store" })
      .then((res) => res.json())
      .then((d) => setCalendar(Array.isArray(d.data) && d.data.length > 0 ? d.data[0] : null))
      .catch(() => setCalendar(null));
  }, []);

  // mailing-list lead magnet — wired to the real /api/join
  const [email, setEmail] = useState("");
  const [sendRecipe, setSendRecipe] = useState(true);
  const [joined, setJoined] = useState(false);
  const [err, setErr] = useState("");
  async function join() {
    if (!email || email.indexOf("@") < 1) { setErr(copy.emailMagnet.errorBadEmail); return; }
    setErr("");
    try {
      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) setJoined(true);
      else setErr(copy.emailMagnet.errorSubmitFailed);
    } catch {
      setErr(copy.emailMagnet.errorSubmitFailed);
    }
  }

  return (
    <main className="min-h-screen bg-merrbakes-pink text-merrbakes-brown font-hand">
      {/* NAV */}
      <StorefrontHeader logoHref="#top" ctaHref="/club" />

      {/* HERO */}
      <section id="top" className="max-w-6xl mx-auto px-5 pt-16 pb-16 lg:pt-20 lg:pb-20 lg:min-h-[72vh] grid lg:grid-cols-2 gap-10 items-center">
        <div>
          <div className="flex flex-wrap gap-2 mb-5 text-base font-bold">
            <span className="bg-merrbakes-yellow text-merrbakes-brown rounded-full px-3 py-1">{copy.hero.pills[0]}</span>
            <span className="bg-twitch-purple text-white rounded-full px-3 py-1">{copy.hero.pills[1]}</span>
            <span className="bg-merrbakes-green text-merrbakes-brown rounded-full px-3 py-1">{copy.hero.pills[2]}</span>
          </div>
          <h1 className="text-5xl sm:text-6xl font-black leading-[1.05] text-balance">
            {copy.hero.headlinePrefix}<span style={hl}>{copy.hero.headlineHighlight}</span>{copy.hero.headlineSuffix}
          </h1>
          <p className={`${prose} text-xl text-merrbakes-brown/80 mt-5 max-w-xl`}>
            {copy.hero.subheadLines.map((line, i) => (
              <span key={i}>
                {line}
                {i < copy.hero.subheadLines.length - 1 && <br />}
              </span>
            ))}
          </p>
          <div className="flex flex-wrap gap-3 mt-7">
            <a href="#menu" className={btnPrimary}>{copy.hero.primaryButton}</a>
            <a href="/club" className={btnGhost}>{copy.hero.secondaryButton}</a>
          </div>
          <div className="flex flex-wrap gap-5 mt-6 text-lg font-semibold text-merrbakes-brown/70">
            <span>{copy.hero.trustLines[0]}</span>
            <span>{copy.hero.trustLines[1]}</span>
          </div>
        </div>
        {heroItems?.length !== 0 && <div className="grid grid-cols-2 gap-4" aria-hidden={heroItems === null}>
          {heroItems === null
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={`bg-white rounded-3xl p-3.5 border border-merrbakes-brown/15 shadow-md ${i === 1 ? "mt-6" : i === 3 ? "-mt-2" : ""}`}
                     style={{ transform: `rotate(${[-2, 1.5, 1, -1.5][i]}deg)` }}>
                  <div className="h-28 rounded-2xl bg-merrbakes-pink/40 animate-pulse" />
                  <div className="mt-2.5 h-5 w-3/4 rounded-full bg-merrbakes-pink/40 animate-pulse" />
                  <div className="mt-2 h-5 w-1/3 rounded-full bg-merrbakes-pink/40 animate-pulse" />
                </div>
              ))
            : heroItems.slice(0, 4).map((c, i) => (
                // hover lift is shadow/border only — a translate utility would be overridden by the inline rotate transform
                <Link key={c.name} href={`/shop/${slugify(c.name)}`}
                      className={`block bg-white rounded-3xl p-3.5 border border-merrbakes-brown/15 shadow-md hover:shadow-xl hover:border-merrbakes-berry/50 transition ${i === 1 ? "mt-6" : i === 3 ? "-mt-2" : ""}`}
                      style={{ transform: `rotate(${[-2, 1.5, 1, -1.5][i]}deg)` }}>
                  {c.photoUrl ? (
                    <div className="h-28 rounded-2xl relative overflow-hidden bg-merrbakes-pink/40">
                      <Image src={c.photoUrl} alt={c.name} fill sizes="(max-width: 1024px) 45vw, 220px" className="object-cover" />
                    </div>
                  ) : (
                    <div className="h-28 rounded-2xl grid place-items-center text-5xl" style={{ background: plates[c.plate ?? "butter"] }}>{c.icon ?? "🍪"}</div>
                  )}
                  <div className="mt-2.5 text-xl font-bold">{c.name}</div>
                  <div className="text-merrbakes-berry text-lg font-bold">{c.price}</div>
                </Link>
              ))}
        </div>}
      </section>

      {/* ABOUT */}
      <section id="about" className="relative bg-merrbakes-yellow overflow-hidden">
        <svg viewBox="0 0 1200 60" preserveAspectRatio="none" className="relative z-20 block w-full h-9 -mb-px" aria-hidden>
          <path
            d="M0,0 H1200 V18 C1150,18 1150,54 1100,54 C1050,54 1050,18 1000,18 C950,18 950,54 900,54 C850,54 850,18 800,18 C750,18 750,54 700,54 C650,54 650,18 600,18 C550,18 550,54 500,54 C450,54 450,18 400,18 C350,18 350,54 300,54 C250,54 250,18 200,18 C150,18 150,54 100,54 C50,54 50,18 0,18 Z"
            fill="#F4D9E1"
          />
        </svg>
        {/* sprinkle field — the content column below has its own opaque background so sprinkles
            never show under the text; the radial fade here is just for a softer look at the edges */}
        <svg
          className="absolute inset-0 z-0 w-full h-full"
          style={{ maskImage: "radial-gradient(ellipse at center, transparent 32%, black 70%)", WebkitMaskImage: "radial-gradient(ellipse at center, transparent 32%, black 70%)" }}
          aria-hidden
        >
          <defs>
            <pattern id="sprinkles" width="221" height="221" patternUnits="userSpaceOnUse">
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
          <rect width="100%" height="100%" fill="url(#sprinkles)" />
        </svg>
        <div className="relative z-10 max-w-3xl mx-auto px-5 pt-10 pb-32 flex flex-col items-center text-center">
          <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-full relative overflow-hidden shadow-md border-4 border-merrbakes-brown">
            <Image src="/merr-photo.png" alt={copy.about.name} fill sizes="192px" className="object-cover" style={{ objectPosition: "center 25%" }} />
          </div>
          {/* opaque only around the text itself, so the padding above/below stays transparent and shows sprinkles */}
          <div className="bg-merrbakes-yellow flex flex-col items-center">
            <div className="text-4xl sm:text-5xl font-black mt-6">{copy.about.name}</div>
            <div className="flex items-center gap-2 mt-2 text-xl font-bold text-merrbakes-brown/80">
              {copy.about.tagline.map((word, i) => (
                <span key={word} className="flex items-center gap-2">
                  {i > 0 && <span className="text-merrbakes-berry text-base">✿</span>}
                  {word}
                </span>
              ))}
            </div>
            <div className={`${prose} text-xl text-merrbakes-brown/75 mt-5 flex flex-col gap-3`}>
              {copy.about.bodyLines.map((line, i) => <p key={i}>{line}</p>)}
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              {copy.about.socials.map((s, i) => {
                const Icon = aboutSocialIcons[i];
                const isTwitch = i === 0;
                const isThrone = i === 6;
                return (
                  <SocialButton key={s.label} href={s.href} ariaLabel={s.label} tooltip={s.tooltip}
                     className={`w-12 h-12 rounded-full grid place-items-center transition ${isTwitch
                       ? "bg-twitch-purple text-white text-2xl hover:opacity-85"
                       : isThrone
                       ? "bg-white border-2 border-merrbakes-brown/60 hover:border-merrbakes-berry overflow-hidden p-2.5"
                       : "bg-white text-merrbakes-brown text-2xl border-2 border-merrbakes-brown/60 hover:border-merrbakes-berry"}`}>
                    <Icon />
                  </SocialButton>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* MENU */}
      <section id="menu" className="bg-white/70 border-y border-merrbakes-brown/15">
        <div className="max-w-6xl mx-auto px-5 py-16">
          <div className="flex flex-wrap items-end justify-between gap-5 mb-8">
            <div>
              <h2 className={`${h2} text-merrbakes-berry`}>{copy.menu.heading}</h2>
            </div>
            <a href="/shop" className={btnPrimary}>{copy.menu.shopButtonLabel}</a>
          </div>
          {menuItems?.length !== 0 && <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {menuItems === null
              ? Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl overflow-hidden border border-merrbakes-brown/15 shadow-sm flex flex-col h-72">
                    <div className="flex-[3] bg-merrbakes-pink/30 animate-pulse" />
                    <div className="flex-1 px-3 py-2 flex flex-col justify-center gap-2">
                      <div className="h-4 w-2/3 rounded-full bg-merrbakes-pink/30 animate-pulse" />
                      <div className="h-4 w-1/4 rounded-full bg-merrbakes-pink/30 animate-pulse" />
                    </div>
                  </div>
                ))
              : menuItems.slice(0, 8).map((it) => (
                  <div key={it.name} className="relative bg-white rounded-2xl overflow-hidden border border-merrbakes-brown/15 shadow-sm hover:-translate-y-1 hover:shadow-md transition flex flex-col h-72">
                    <Link href={`/shop/${slugify(it.name)}`} className="absolute inset-0 z-10" aria-label={it.name} />
                    {/* image is 75% of the card height, info strip below is the other 25% */}
                    <div className="relative flex-[3]">
                      {it.photoUrl ? (
                        <Image src={it.photoUrl} alt={it.name} fill sizes="(max-width: 768px) 45vw, 220px" className="object-cover" />
                      ) : (
                        <div className="absolute inset-0 grid place-items-center text-5xl" style={{ background: plates[it.plate ?? "butter"] }}>{it.icon ?? "🍪"}</div>
                      )}
                      {it.tag && (
                        <span className={`absolute top-2.5 left-2.5 text-sm font-bold rounded-full px-2.5 py-1 ${it.limited ? "bg-merrbakes-brown text-merrbakes-yellow" : "bg-merrbakes-yellow text-merrbakes-brown"}`}>{it.tag}</span>
                      )}
                      <button type="button"
                         onClick={() => addDefaultVariant(it)}
                         disabled={!variantsLoaded}
                         className="absolute bottom-2.5 right-2.5 z-20 bg-merrbakes-berry text-white rounded-full px-4 py-1.5 text-lg font-bold hover:opacity-85 transition shadow-sm disabled:opacity-60 disabled:animate-pulse disabled:cursor-wait">{copy.menu.addButtonLabel}</button>
                    </div>
                    <div className="relative flex-1 px-3 py-2">
                      <div className="text-lg font-bold leading-tight line-clamp-2 pr-14">{it.name}</div>
                      <span className="absolute bottom-2 right-3 text-lg font-black text-merrbakes-berry">{it.price}</span>
                    </div>
                  </div>
                ))}
          </div>}
          <p className={`${prose} mt-6 text-merrbakes-brown/70 text-lg`}>
            {copy.menu.footerLine}{" "}
            <a href="/club" className="font-bold text-merrbakes-berry underline decoration-merrbakes-yellow decoration-4">{copy.menu.footerLinkText}</a>
          </p>
        </div>
      </section>

      {/* CLUB */}
      <section id="club" className="bg-merrbakes-green border-y border-merrbakes-brown/15">
        <div className="max-w-6xl mx-auto px-5 py-16">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className={`${h2} text-merrbakes-berry`}>{copy.club.heading}</h2>
            <p className={`${prose} text-xl text-merrbakes-brown mt-3`}>
              {copy.club.subhead}
            </p>
          </div>
          {pastMenus?.length !== 0 && <div className="grid md:grid-cols-3 gap-6 items-start">
            {pastMenus === null ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i}>
                <div className="aspect-square rounded-2xl bg-white/50 animate-pulse" />
                <div className="h-5 w-1/3 mx-auto mt-3 rounded-full bg-white/50 animate-pulse" />
              </div>
            )) : pastMenus.map((m) => (
              <div key={m.month}>
                {m.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- unknown per-photo
                  // dimensions from Notion; a plain img shows it uncropped at its own aspect ratio
                  <img src={m.photoUrl} alt={`${m.theme} — ${formatMonth(m.month)}`} className="w-full h-auto rounded-2xl shadow-sm" />
                ) : (
                  <div className="aspect-square rounded-2xl grid place-items-center text-5xl" style={{ background: plates.butter }}>🎁</div>
                )}
                <div className="text-merrbakes-brown text-lg font-bold tracking-wide mt-3 text-center">{formatMonth(m.month)}</div>
              </div>
            ))}
          </div>}
          <div className="text-center mt-8">
            <a href="/club" className={btnPrimary}>{copy.club.ctaButton}</a>
          </div>
        </div>
      </section>

      {/* EMAIL LEAD MAGNET */}
      <section id="subscribe" className="bg-gradient-to-br from-twitch-purple to-merrbakes-berry text-white">
        <div className="max-w-6xl mx-auto px-5 py-16 grid lg:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="text-4xl font-black mt-1 text-merrbakes-yellow">{copy.emailMagnet.heading}</h2>
            <p className={`${prose} text-xl mt-3 opacity-90 max-w-lg`}>
              {copy.emailMagnet.subhead}
            </p>
          </div>
          <div className="bg-white/10 border border-white/25 rounded-3xl p-6">
            {joined ? (
              <div className={`${prose} text-2xl text-white py-3`}>{copy.emailMagnet.successMessage}</div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input id="ml" type="email" value={email} placeholder={copy.emailMagnet.inputPlaceholder} autoComplete="email"
                         aria-label={copy.emailMagnet.formLabel}
                         onChange={(e) => setEmail(e.target.value)}
                         className={`${prose} flex-1 rounded-full px-5 py-3 text-lg text-merrbakes-brown bg-white outline-none focus:ring-4 focus:ring-merrbakes-yellow`} />
                  <button type="button" onClick={join}
                          className="bg-merrbakes-yellow text-merrbakes-brown rounded-full px-6 py-3 text-xl font-bold hover:opacity-90 transition whitespace-nowrap">{copy.emailMagnet.submitButton}</button>
                </div>
                <label className={`${prose} flex items-center gap-2 mt-3 text-base font-semibold text-white/90 cursor-pointer`}>
                  <input type="checkbox" checked={sendRecipe} onChange={(e) => setSendRecipe(e.target.checked)}
                         className="w-4 h-4 rounded accent-merrbakes-yellow" />
                  send me the recipe
                </label>
                <div className={`${prose} opacity-80 text-base mt-3`}>{err || copy.emailMagnet.helperText}</div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* WATCH / GANG */}
      <section id="watch">
        <div className="max-w-2xl mx-auto px-5 py-16 text-center">
          <h2 className={`${h2} text-merrbakes-berry`}>{copy.watch.heading}</h2>
          <p className={`${prose} text-xl text-merrbakes-brown/75 mt-3`}>
            {copy.watch.subhead}
          </p>
          {calendar === undefined && (
            <div className="w-full aspect-[4/3] rounded-2xl bg-white/60 animate-pulse mt-7" />
          )}
          {calendar?.photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- unknown dimensions from Notion;
            // a plain img shows it uncropped at its own aspect ratio (same approach as the club photos)
            <img src={calendar.photoUrl} alt={`stream schedule — ${formatMonth(calendar.month)}`} className="w-full h-auto rounded-2xl shadow-sm mt-7" />
          )}
          <div className="flex flex-wrap gap-3 justify-center mt-7">
            {copy.watch.buttons.map((b, i) => (
              <a key={b.label} href={b.href} target="_blank" rel="noreferrer"
                 className={i === 0 ? "bg-twitch-purple text-white rounded-full px-6 py-3 text-xl font-bold hover:opacity-85 transition" : btnGhost}>
                {b.label}
              </a>
            ))}
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
                  <a key={l.label} href={l.href} className="block opacity-85 hover:opacity-100 py-0.5">{l.label}</a>
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
