// Copy for the cart drawer (src/components/CartDrawer.tsx), shown on every
// storefront page. Edit text here; layout/behavior live in the component.

export const cartCopy = {
  title: "your cart",
  detailsTitle: "almost there",
  closeLabel: "close cart",
  empty: "Oh no, your cart is empty! It definitely needs something tasty from the menu.",
  each: "each",
  remove: "remove",

  details: {
    intro: "just need your email before payment.",
    emailLabel: "email",
    emailPlaceholder: "you@email.com",
    checking: "checking…",
    subscribeLabel: "subscribe to email list",
    referralLabel: "who referred you? (optional)",
    referralPlaceholder: "their name",
    // the club-week code gives free shipping on the drop item; any other code is
    // looked up as a Stripe promotion code and applied at checkout
    promoLabel: "promo code (optional)",
    backToCart: "← back to cart",
  },

  gift: {
    toggle: "🎁 this is a gift",
    recipientLabel: "who's it for?",
    recipientPlaceholder: "their name or username",
    addressAtCheckout: "i'll enter their shipping address at checkout",
    addressFromMerr: "i don't have their address — merr will reach out to them for it",
    messageLabel: "gift message (optional)",
  },

  subtotal: "subtotal",
  checkoutButton: "checkout →",
  continueButton: "continue →",
  redirecting: "redirecting…",

  errors: {
    email: "enter your email to continue.",
    giftRecipient: "add who the gift is for.",
    generic: "something went wrong starting checkout — try again in a moment.",
  },
};
