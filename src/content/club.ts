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
        a: "Of course — manage from your Ko-fi account or contact Merr." },
      { q: "what if i have allergies?",
        a: "Everything's made in a home kitchen that also handles wheat, dairy, eggs, and nuts. If you'd like to request accommodations, message Merr to talk about options." },
      { q: "when am i billed?",
        a: "On the day you join, then the same date each month, or the same day of the week each week." },
      { q: "can i gift a membership?",
        a: "Totally — grab a tier with the recipient's address, or DM Merr and she'll help set it up as a gift." },
      { q: "what is cookie club week, and when is it?",
        a: "Cookie club week is the week of the month where Merr works on Cookie Club and Confectioner's Club items. You can find out when it is by looking at the calendar.",
        link: { label: "see the calendar →", href: "/shop?calendar=1" } },
    ],
  },


  footer: option16Copy.footer,
};
