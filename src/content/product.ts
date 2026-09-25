// Copy for /shop/[slug] — the single-product detail page, linked from any of
// the grids on /shop or /option16. The nav and footer are pulled directly from
// option16/shopCopy so they stay identical — see src/content/shop.ts.
// This file holds only the copy that's unique to the product detail page.
import { shopCopy } from "@/content/shop";

export const productCopy = {
  backLink: "← back to the shop",

  notFound: {
    heading: "couldn't find that item",
    subhead: "it may have sold out or been renamed.",
    buttonLabel: "back to the shop",
  },

  shipsNote: "📦 ships once this batch fills",

  variantPickerLabel: "choose an option",

  addButtonLabel: "add to cart",
  addedButtonLabel: "added to cart ✓",

  kofiLink: {
    label: "or order on ko-fi →",
    href: "https://ko-fi.com/merrbakes/shop",
  },

  reviews: {
    heading: "Reviews",
    countOne: "review",
    countMany: "reviews",
    photoAlt: "Photo from",
    // shown when a review has no author name
    anonymousName: "Anonymous",
    enlargeLabel: "Enlarge photo from",
    closePhotoLabel: "Close photo",
  },

  footer: shopCopy.footer,
};
