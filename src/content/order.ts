// Copy for /order/[session] — the page Stripe Checkout sends buyers back to.
// Nav and footer are shared with /shop — see src/content/shop.ts.
import { shopCopy } from "@/content/shop";

export const orderCopy = {
  heading: "thank you 🎉",
  subhead: "Your order has been submitted successfully!",
  // when the whole checkout was a tip (/api/tip)
  tipOnlyHeading: "Thank you for the tip! 💖",
  tipOnlySubhead: "Merr really appreciates it.",
  quantityPrefix: "×",

  downloads: {
    heading: "Download your recipes now",
    // shown prominently: this page is the only delivery of digital files
    warning: "This page is the only place to get your files — download them before you leave. If you lose them, please message Merr.",
    buttonLabel: "download",
    downloadedLabel: "downloaded ✓",
    noFileYet: "Merr will send this one to you directly — message her if it doesn't arrive.",
    // browsers show their own generic text for this, but some still use it
    leaveWarning: "You haven't downloaded all your recipes yet — leave anyway?",
  },

  membership: {
    heading: "🎉 welcome to the club!",
    // {code} = the club week code
    perk: (code: string) => `Your member perk: free shipping on club week drops. When Merr posts the drop, use code "${code}" at checkout.`,
    manage: "manage your membership →",
  },

  notFound: {
    heading: "We couldn't find that order",
    subhead: "If you just paid, give it a moment and refresh. Still missing? Message Merr!",
  },

  contactLabel: "Message Merr on instagram",
  contactHref: "https://www.instagram.com/MerrBakes",
  backLabel: "back to the shop",

  footer: shopCopy.footer,
};
