// Copy for the cart drawer (src/components/CartDrawer.tsx), shown on every
// storefront page. Edit text here; layout/behavior live in the component.

export const cartCopy = {
  title: "your cart",
  detailsTitle: "almost there",
  closeLabel: "close cart",
  backLabel: "back to cart",
  empty: "Oh no, your cart is empty! It definitely needs something tasty from the menu.",
  each: "each",
  remove: "remove",

  details: {
    emailLabel: "Email address",
    emailPlaceholder: "you@email.com",
    checking: "Checking…",
    subscribeLabel: "Subscribe to email list",
    referralLabel: "Who referred you? (Optional)",
    referralPlaceholder: "Their name or handle",
    // the club-week code gives free shipping on the drop item; any other code is
    // looked up as a Stripe promotion code and applied at checkout
    promoPlaceholder: "Promo code (Optional)",
  },

  gift: {
    toggle: "🎁 Is this a gift?",
    recipientLabel: "Who is it for?",
    recipientPlaceholder: "Their name or handle",
    addressAtCheckout: "I'll enter their shipping address at checkout",
    addressFromMerr: "I don't have their address — Merr will reach out to them for it",
    messageLabel: "Gift message (optional)",
    // shown on Stripe's checkout page and as the payment's description in
    // Merr's Stripe dashboard; {name} is the recipient
    stripeAddressNote: "🎁 This is a gift for {name} — enter their shipping address.",
    stripeMerrAsksNote: "🎁 This is a gift for {name} — Merr will reach out to them for their shipping address.",
    stripeDescription: "🎁 Gift for {name}",
  },

  subtotal: "subtotal",
  tip: "Tip for Merr",
  checkoutButton: "checkout →",
  continueButton: "continue →",
  redirecting: "redirecting…",

  errors: {
    email: "Enter your email to continue.",
    giftRecipient: "Add who the gift is for.",
    generic: "Something went wrong starting checkout — try again in a moment.",
    // returned by /api/checkout and shown in the cart as-is
    invalidPromo: "That code isn't valid.",
    missingItems: "Your cart is empty.",
    invalidLine: "Something's wrong with an item in your cart — try removing it and adding it again.",
    unavailable: "One of the items in your cart is no longer available.",
    membershipInCart: "Memberships sign up on their own page, not through the cart.",
    pricesUpdating: "Prices are being updated — please try again in a minute.",
  },
};
