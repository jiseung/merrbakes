// Copy for /club — a dedicated membership landing page built out of option16's
// club section. Edit text here; layout/behavior live in src/app/club/page.tsx.
//
// Nav and footer are pulled from option16 so they stay identical site-wide
// (shared chrome) — see src/content/option16.ts. Everything else, including
// the hero/tiers section that used to read from option16Copy.club, is owned
// here so this page's copy has one source of truth.
import { option16Copy } from "@/content/option16";

export const clubCopy = {
  hero: {
    // was blank before (o16.club had no eyebrow field) — left empty here too
    // rather than inventing new copy; fill in if a real eyebrow is wanted.
    eyebrow: "",
    heading: "✿ the membership clubs",
    subhead: "Here are your choice of clubs to join - all freshly baked and sent directly to your door on schedule",
    tiers: [
      // New, 2026-09-09 — real name/price pulled from the live "merrbakes.com shop
      // items" Notion db (Type: Recurring): "Tweat of the Week Club", $25. Note the
      // Notion name is singular ("Tweat", not "Tweats") — kept exact so this still
      // matches the live-price fetch in page.tsx (normalizeName compares against
      // Notion's row name). Perks below are a first-draft placeholder (owner asked
      // for a draft to edit), not confirmed copy.
      { name: "Tweat of the Week Club", price: "$25", billing: "wk", featured: false, isNew: true,
        perks: [
          "A brand-new treat every week, shipped",
          "First to try Merr's newest recipes",
          "Occasional freebies",
          "Discord access"
        ] },
      { name: "Cookie Club", price: "$35", featured: false,
        perks: [
          "A monthly themed cookie box, shipped",
          "5 different flavors every time",
          "Occasional freebies",
          "Guaranteed entry to any giveaways",
          "Discord access"
        ] },
      { name: "Tasting Club", price: "$62", featured: true,
        perks: [
          "The full monthly tasting box",
          "Everything in Cookie Club",
          "Everything in Confectioner's Club",
          "Occasional freebies"
        ] },
      { name: "Confectioner's Club", price: "$32", featured: false,
        perks: [
          "For the chocolate devotees",
          "Monthly hand-curated artisan chocolate",
          "Limited boxes available each month",
          "Occasional freebies"
        ] },

    ],
    featuredBadge: "most loved",
    newBadge: "NEW!",
    // tier card buttons — "join here" scrolls to the join section below with
    // that club picked; monthly clubs keep a Ko-fi option for people who prefer it
    joinHereLabel: (tier: string) => `join ${tier}`,
    orKofiLabel: "or join on ko-fi →",
    kofiHref: "https://ko-fi.com/merrbakes",
  },

  // replaces the old mailing-list box: signup for every club sold on
  // merrbakes.com (Stripe). Prices/levels come live from Notion.
  join: {
    eyebrow: "✿ join on merrbakes.com",
    heading: "sign up for a club",
    // the incentive for joining here instead of Ko-fi (owner, 2026-09-24)
    perk: "🚚 join here and get free shipping on club week drops.",
    pickClub: "pick your club",
    pickLevel: "pick your level",
    // "{n}" = tweats per week from the level's Quantity multiplier in Notion
    tweatsPerWeek: (n: number) => (n === 1 ? "1 tweat every week" : `${n} tweats every week`),
    levelNote: "merr picks what goes in your box — different tweats or extra servings.",
    perWeek: "/ week",
    perMonth: "/ month",
    // {price} = chosen option's price, {box} = first box's cutoff, {weekly} = first Friday charge
    weeklyBilling: (price: string, box: string, weekly: string) =>
      `you'll pay ${price} today for your first box (finalized ${box}), then every friday at 6pm central starting ${weekly}. change your level any time before friday 6pm and that week's box follows it.`,
    monthlyBilling: (price: string) => `you'll pay ${price} today, then on the same date each month.`,
    emailLabel: "your email",
    emailPlaceholder: "you@email.com",
    submitLabel: "join the club",
    submittingLabel: "taking you to checkout…",
    errorMessage: "something went wrong — try again in a sec?",
    unavailable: "signups are closed right now — check back soon!",
    manage: {
      heading: "already a member?",
      body: "joined here? change your club or level, update your address or card, or cancel. (joined on ko-fi? manage it on ko-fi.)",
      linkLabel: "manage my membership →",
    },
  },

  how: {
    eyebrow: "✿ how the club works",
    heading: "three steps to treats on repeat.",
    steps: [
      { icon: "😋", title: "pick your club", body: "Choose any club. Change or cancel anytime." },
      { icon: "🍪", title: "merr bakes it fresh", body: "Every box is made by hand, in small batches, live on stream." },
      { icon: "🥳", title: "a box lands monthly", body: "Carefully-packed box filled with yummy treats shows up at your door." },
    ],
  },

  benefits: {
    eyebrow: "✿ what you get",
    heading: "more than just cookies.",
    items: [
      { icon: "📜", title: "vote on the menu", body: "Help pick what Merr bakes next week." },
      { icon: "💙", title: "role in discord", body: "An exclusive corner of the server just for members." },
      { icon: "💯", title: "cancel anytime", body: "No contracts. Pause whenever." },
    ],
  },

  faq: {
    eyebrow: "✿ good to know",
    heading: "frequently asked questions",
    items: [
      { q: "how does shipping work?",
        a: "Boxes ship monthly (or weekly) within the US, packed with care. You'll get a tracking number so that you know when it'll arrive." },
      { q: "can i really cancel anytime?",
        a: "Of course — if you joined here, use \"manage my membership\" on this page; if you joined on Ko-fi, manage it from your Ko-fi account. Or just contact Merr." },
      { q: "what if i have allergies?",
        a: "Everything's made in a home kitchen that also handles wheat, dairy, eggs, and nuts. If you'd like to request accommodations, message Merr to talk about options." },
      { q: "when am i billed?",
        a: "Monthly clubs: on the day you join, then the same date each month. Tweat of the Week: on the day you join (for your first box), then every Friday at 6pm Central." },
      { q: "can i gift a membership?",
        a: "Totally — grab a tier with the recipient's address, or DM Merr and she'll help set it up as a gift." },
      { q: "what is cookie club week, and when is it?",
        a: "Cookie club week is the week of the month where Merr works on Cookie Club and Confectioner's Club items. You can find out when it is by looking at the calendar.",
        link: { label: "see the calendar →", href: "/shop?calendar=1" } },
    ],
  },


  footer: option16Copy.footer,
};
