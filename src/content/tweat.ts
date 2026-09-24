// Copy for /tweat — the Tweat of the Week Club signup + level page. The club's
// name, description, photo and level prices come live from Notion; this file
// is only the page's own wording. Nav/footer shared with /shop.
import { shopCopy } from "@/content/shop";

export const tweatCopy = {
  eyebrow: "✿ weekly membership",
  pickLevel: "pick your level",
  // "{n}" = tweats per week from the level's Quantity multiplier in Notion
  tweatsPerWeek: (n: number) => (n === 1 ? "1 tweat every week" : `${n} tweats every week`),
  levelNote: "merr picks what goes in your box — different tweats or extra servings.",
  perWeek: "/ week",
  howItWorks: [
    "you're billed every friday at 6pm central, when merr goes live.",
    "change your level any time before friday 6pm and that week's box follows it.",
    "cancel any time — it stops after your current week.",
  ],
  // {price} = the chosen level's price, {box} = the first box's cutoff, {weekly} = first Friday charge
  firstCharge: (price: string, box: string, weekly: string) =>
    `you'll pay ${price} today for your first box (finalized ${box}), then every friday at 6pm central starting ${weekly}.`,
  emailLabel: "your email",
  emailPlaceholder: "you@email.com",
  submitLabel: "join the club",
  submittingLabel: "taking you to checkout…",
  errorMessage: "something went wrong — try again in a sec?",
  manage: {
    heading: "already a member?",
    body: "change your level, update your address or card, or cancel.",
    linkLabel: "manage my membership →",
  },
  unavailable: "the club isn't open for signups right now — check back soon!",
  footer: shopCopy.footer,
};
