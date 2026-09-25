// Copy for the optional tip (src/components/TipPicker.tsx), shown in the cart
// drawer and /club's join form, plus the standalone "tip merr" link.
export const tipsCopy = {
  label: "Add a tip for Merr? 💖",
  none: "No tip",
  // preset amounts in dollars; "other" lets them type any amount ($1–$500)
  presets: [2, 5],
  otherPlaceholder: "Amount",
  noteLabel: "Note to Merr (Optional)",
  footerLink: "Tip Merr 💖",
  // the footer link's own checkout (src/app/api/tip/route.ts) — these are field
  // labels on Stripe's page, which caps each at 50 characters
  standalone: {
    noteLabel: "Note to Merr (Optional)",
    streamNameLabel: "Name to be shown on stream (Optional)",
  },
};
