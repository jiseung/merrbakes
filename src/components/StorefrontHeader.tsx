"use client";
// Shared nav for /option16, /shop, /shop/[slug], /club — was duplicated
// near-identically across all four; pulled out here so the cart button (below)
// only has to be added in one place. logoHref/ctaHref/resolveHref cover the
// small per-page differences (option16 uses in-page anchors, the other three
// pages need anchors prefixed with /option16).
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { BiCart } from "react-icons/bi";
import { option16Copy as copy } from "@/content/option16";
import { useCart } from "@/lib/cart";
import CartDrawer from "./CartDrawer";

export default function StorefrontHeader({
  logoHref,
  ctaHref,
  resolveHref = (href: string) => href,
  sprinkleBg = false,
}: {
  logoHref: string;
  ctaHref: string;
  resolveHref?: (href: string) => string;
  // /club's hero continues this same yellow sprinkle field up into the nav, so
  // there's no color seam between them — every other page keeps the plain pink bar.
  sprinkleBg?: boolean;
}) {
  // real Twitch live-status check (via /api/twitch-live), replacing the old
  // hour-of-day guess — polled every 2 minutes so the pill catches her going
  // live/offline without a page reload.
  const [isLive, setIsLive] = useState(false);
  useEffect(() => {
    let cancelled = false;
    function checkLive() {
      fetch("/api/twitch-live", { cache: "no-store" })
        .then((res) => res.json())
        .then((d) => { if (!cancelled) setIsLive(!!d.isLive); })
        .catch(() => {});
    }
    checkLive();
    const interval = setInterval(checkLive, 2 * 60 * 1000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const { count, open } = useCart();

  const pathname = usePathname();

  // scrollspy for the anchor links (#about, #menu, #watch) — those sections only
  // exist in the DOM on /option16 itself, so this naturally finds nothing (and
  // no anchor link ever shows active) on /shop, /shop/[slug], /club.
  const [activeSection, setActiveSection] = useState<string | null>(null);
  useEffect(() => {
    const ids = copy.nav.links.filter((l) => l.href.startsWith("#")).map((l) => l.href.slice(1));
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    // a thin band just under the sticky header — a section counts as "current"
    // once it crosses that line, rather than whenever any part of it is visible.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) {
          // nothing in the trigger band — e.g. scrolled back above #about, or past
          // #watch into the footer. Clear rather than leaving a stale section lit.
          setActiveSection(null);
          return;
        }
        const topmost = visible.reduce((a, b) => (a.boundingClientRect.top < b.boundingClientRect.top ? a : b));
        setActiveSection(topmost.target.id);
      },
      { rootMargin: "-100px 0px -60% 0px", threshold: 0 }
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [pathname]);

  // route links (e.g. "shop" → /shop) are active by matching pathname; anchor
  // links (e.g. "#menu") are active by matching the scrollspy'd section — but
  // only when the anchor's own page is the current page.
  function isActive(href: string) {
    const resolved = resolveHref(href);
    if (resolved.includes("#")) {
      const [path, fragment] = resolved.split("#");
      if (path && path !== pathname) return false;
      return activeSection === fragment;
    }
    return pathname === resolved || pathname.startsWith(`${resolved}/`);
  }

  return (
    <>
      {/* sprinkleBg currently renders as solid yellow (trying this instead of the
          sprinkle-pattern version) — still merges seamlessly into /club's sprinkle
          hero below it since that section's own background is the same yellow. */}
      <header className={`sticky top-0 z-40 overflow-hidden ${sprinkleBg ? "bg-merrbakes-yellow" : "backdrop-blur bg-merrbakes-pink/85 border-b border-merrbakes-brown/20"}`}>
        <div className="relative z-10 max-w-6xl mx-auto px-5 h-16 flex items-center gap-4">
          <a href={logoHref} className="text-3xl font-black">{copy.nav.logo}</a>
          <nav className="hidden md:flex gap-1 ml-2 text-xl font-semibold">
            {copy.nav.links.map((l) => (
              <a key={l.label} href={resolveHref(l.href)}
                 className={`px-3 py-1.5 rounded-lg hover:bg-white/60 ${isActive(l.href) ? "bg-white/70 text-merrbakes-berry" : ""}`}>
                {l.label}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            {isLive && (
              <a href="https://twitch.tv/merrbakes" target="_blank" rel="noreferrer"
                 className="flex items-center gap-2 bg-white border border-merrbakes-brown/30 rounded-full px-3 py-1.5 text-lg font-bold hover:border-twitch-purple transition">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                {copy.nav.liveLabel}
              </a>
            )}
            <button type="button" onClick={open} aria-label="open cart" className="relative p-2 rounded-full hover:bg-white/60 transition">
              <BiCart className="text-2xl" />
              {count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-merrbakes-berry text-white text-xs font-black rounded-full w-5 h-5 grid place-items-center">
                  {count}
                </span>
              )}
            </button>
            <a href={ctaHref} className="bg-merrbakes-berry text-white rounded-full px-4 py-2 text-lg font-bold hover:opacity-85 transition">{copy.nav.ctaButton}</a>
          </div>
        </div>
      </header>
      <CartDrawer />
    </>
  );
}
