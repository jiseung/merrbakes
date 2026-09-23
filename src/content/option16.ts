// Copy for the homepage (/, formerly /option16 "The Storefront"). This is the file to edit for text
// changes — labels, headings, menu/tier/post copy, button text, etc.
// Saving this file hot-reloads the page like any other source file.
// Layout, styling, and behavior live in src/app/page.tsx.

export type Plate = "choc" | "straw" | "butter" | "matcha";

export const option16Copy = {
  nav: {
    logo: "merrbakes",
    links: [
      { label: "about", href: "#about" },
      { label: "menu", href: "#menu" },
      { label: "shop", href: "/shop" },
      { label: "watch", href: "#watch" },
    ],
    liveLabel: "watch live",
    ctaButton: "join the club",
  },

  hero: {
    pills: ["fresh weekly drops", "baked live on twitch", "ships nationwide"],
    headlinePrefix: "fresh, ",
    headlineHighlight: "handmade cookies",
    headlineSuffix: " — shipped to your door.",
    subheadLines: [
      "Order one of this week's small-batch treats,",
      "or join the cookie club and never run out.",
      "Baked live with love, packaged with care, delivered nationwide.",
    ],
    primaryButton: "order now",
    secondaryButton: "join the club",
    trustLines: ["⭐ loved by 1,000+ viewers", "📦 500+ boxes shipped"],
  },

  about: {
    name: "hi  i'm merrbakes",
    tagline: ["baker", "streamer", "gamer"],
    bodyLines: [
      "I'm your pastry person with an actual baking degree, which means I can make all the stuff you've heard about.",
      "I've made dubai chewy cookies, butter tteoks, gourmet cosmic brownies -- handmade in small batches, all live on stream.",
      "I love sharing my yummy treats with all the friends I meet, so you can get any of my goodies shipped directly to you or your friend.",
      "Hope to talk to you soon!"
    ],
    // row of small icon buttons below the bio, in display order. Icon per entry is
    // matched by position in src/app/page.tsx (aboutSocialIcons).
    socials: [
      { label: "twitch", href: "https://twitch.tv/merrbakes", tooltip: "Twitch: watch Merr live" },
      { label: "youtube", href: "https://www.youtube.com/@MerrBakes", tooltip: "YouTube: funny clips & livestreams" },
      { label: "tiktok", href: "https://www.tiktok.com/@merrbakes", tooltip: "TikTok: funny merr clips" },
      { label: "instagram", href: "https://www.instagram.com/MerrBakes", tooltip: "Instagram: menus & updates" },
      { label: "discord", href: "https://discord.gg/uRAWAWMQKU", tooltip: "Discord: join the merringue gang" },
      { label: "ko-fi", href: "https://ko-fi.com/merrbakes", tooltip: "Ko-fi: support the bakery" },
      { label: "throne wishlist", href: "https://throne.com/merrbakes", tooltip: "Throne: send a gift 🎁" },
    ],
  },

  menu: {
    heading: "✿ check out the menu",
    shopButtonLabel: "visit the shop →",
    addButtonLabel: "add +",
    footerLine: "pre-order now → baked fresh live on twitch → shipped directly to your door.",
    footerLinkText: "cookie club members get first dibs & free shipping during cookie club week.",
  },

  club: {
    heading: "✿ the membership clubs",
    subhead: "New curated box of treats every month - here's a peek at what past boxes looked like",
    ctaButton: "see membership tiers",
  },

  emailMagnet: {
    eyebrow: "✿ free from merr's kitchen",
    heading: "not ready to commit yet?",
    subhead: "Join the mailing list now, and I'll send you my most-requested cookie recipe, and a lil discount on your first box. You'll get a short and sweet update weekly, so you never miss out.",
    formLabel: "where should merr send the recipe?",
    inputPlaceholder: "you@email.com",
    submitButton: "sign up",
    helperText: "free recipe + first-drop discount. unsubscribe anytime.",
    errorBadEmail: "hmm, that email looks off — mind checking it?",
    errorSubmitFailed: "something went wrong — try again in a sec?",
    successMessage: "🎉 yay! check your inbox — the recipe's on its way. welcome to the gang.",
  },

  watch: {
    eyebrow: "✿ join the merringue gang",
    heading: "come hang out while it bakes.",
    subhead: "This month's schedule, so you know what's in store!",
    // tooltips for these live under about.socials, not here — see the note there.
    buttons: [
      { label: "watch on twitch", href: "https://twitch.tv/merrbakes" },
      { label: "watch on youtube", href: "https://www.youtube.com/@MerrBakes" },
      { label: "join the discord", href: "https://discord.gg/uRAWAWMQKU" }
    ],
  },

  footer: {
    logo: "merrbakes",
    columns: [
      {
        title: "shop",
        links: [
          { label: "this week's menu", href: "#menu" },
          { label: "the membership clubs", href: "/club" },
          { label: "the shop", href: "/shop" },
          { label: "the ko-fi shops", href: "https://ko-fi.com/merrbakes/shop" },
          { label: "gifts for merr", href: "https://throne.com/merrbakes" }
        ],
      },
      {
        title: "hang",
        links: [
          { label: "twitch", href: "https://twitch.tv/merrbakes" },
          { label: "discord", href: "https://discord.gg/uRAWAWMQKU" },
          { label: "mailing list", href: "#subscribe" },
        ],
      },
    ],
    copyright: "© 2026 merrbakes",
  },
};
