// Copy for /shop — a dedicated storefront page built out of option16's drop
// section. The nav, menu items, and footer are pulled directly from option16
// so they stay identical — see src/content/option16.ts.
// This file holds only the copy that's unique to the shop page.
import { option16Copy } from "@/content/option16";

export const shopCopy = {
  hero: {
    heading: "the full menu",
    subhead: "Everything merr's baking — pre-order now!",
  },

  calendarToggle: {
    showLabel: "📅 see what's baking this month",
    hideLabel: "✕ hide calendar",
    emptyMessage: "nothing's on the calendar yet — check back soon!",
  },

  merch: {
    heading: "merrch",
    subhead: "the merringue gang gear — not baked, but just as cozy.",
    linkLabel: "🎁 looking for merrch?",
    backLabel: "🍪 back to baked goods",
  },

  digital: {
    heading: "digital recipes",
    subhead: "merr's own recipe cards ready in an instant",
  },

  customOrders: {
    eyebrow: "✿ don't see it here?",
    heading: "custom orders are welcome!",
    subhead: "Cakes, cookies, whatever you want — Merr takes custom requests too.",
    openLabel: "ask about a custom order",
    namePlaceholder: "Your name",
    emailPlaceholder: "you@email.com",
    messagePlaceholder: "What are you craving?",
    submitLabel: "send request",
    submittingLabel: "sending…",
    successMessage: "merr will get back to you soon.",
    errorMessage: "something went wrong — try again in a sec?",
    secondaryLabel: "or dm on instagram",
    secondaryHref: "https://www.instagram.com/MerrBakes",
  },

  footer: option16Copy.footer,
};
