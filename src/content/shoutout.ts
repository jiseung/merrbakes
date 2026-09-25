// Copy for the stream shout-out fields (src/components/StreamShoutoutFields.tsx),
// shown in the cart drawer and /club's join form. New orders and signups get an
// on-stream alert (see src/lib/streamAlert.ts) — this is where buyers pick the name.

export const shoutoutCopy = {
  nameLabel: "Name to be shown on stream (Optional)",
  namePlaceholder: "Anonymous unless you add your name",
};

// Wording sent with each on-stream alert (src/lib/streamAlert.ts), keyed by kind.
// Merr's MixItUp command shows it as e.g. "CookieFan just bought Croissants!"
export const alertPhrases = {
  purchase: "just bought",
  subscription: "just joined",
  donation: "just donated",
};
