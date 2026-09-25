// MOCKUP ONLY — fake reviews for previewing the reviews section on product
// pages (src/components/ProductReviews.tsx). Only rendered outside production,
// so these never show on the live site. Real reviews will come from the Notion
// "merrbakes.com shop item reviews" database once that's wired up.
import type { Review } from "@/components/ProductReviews";

export const sampleReviews: Review[] = [
  {
    name: "",
    date: "2026-09-20",
    text: "This is a sample review so you can see how reviews look on a product page. Arrived well packed and still fresh — the whole box was gone in a day.",
    // stand-in for a customer photo: the product page passes the item's own photo
    usePhoto: true,
  },
  {
    name: "Another Sample",
    date: "2026-09-12",
    text: "A second, text-only sample review, to show a review without a photo.",
  },
];
