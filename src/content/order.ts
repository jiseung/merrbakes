// Copy for /order/[session] — the page Stripe Checkout sends buyers back to.
// Nav and footer are shared with /shop — see src/content/shop.ts.
import { shopCopy } from "@/content/shop";

export const orderCopy = {
  heading: "thank you! 🎉",
  subhead: "your order went through. here's what you got:",
  // when the whole checkout was a tip (/api/tip)
  tipOnlyHeading: "thank you for the tip! 💖",
  tipOnlySubhead: "merr really appreciates it.",
  quantityPrefix: "×",

  downloads: {
    heading: "📥 download your recipes now",
    // shown prominently: this page is the only delivery of digital files
    warning: "this page is the only place to get your files — download them before you leave. if you lose them, message merr and she'll sort you out.",
    buttonLabel: "download",
    downloadedLabel: "downloaded ✓",
    noFileYet: "merr will send this one to you directly — message her if it doesn't arrive.",
    // browsers show their own generic text for this, but some still use it
    leaveWarning: "you haven't downloaded all your recipes yet — leave anyway?",
  },

  membership: {
    heading: "🎉 welcome to the club!",
    // {code} = the club week code
    perk: (code: string) => `your member perk: free shipping on club week drops. when merr posts the drop, use code "${code}" at checkout.`,
    manage: "change or cancel your membership any time →",
  },

  notFound: {
    heading: "we couldn't find that order",
    subhead: "if you just paid, give it a moment and refresh. still missing? message merr and she'll help.",
  },

  contactLabel: "message merr on instagram",
  contactHref: "https://www.instagram.com/MerrBakes",
  backLabel: "back to the shop",

  footer: shopCopy.footer,
};
