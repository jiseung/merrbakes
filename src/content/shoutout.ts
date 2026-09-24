// Copy for the stream shout-out fields (src/components/StreamShoutoutFields.tsx),
// shown in the cart drawer and /club's join form. New orders and signups get an
// on-stream alert (see src/lib/streamAlert.ts) — this is where buyers pick the name.

export const shoutoutCopy = {
  nameLabel: "name shown on stream",
  namePlaceholder: "your first name",
  // the site doesn't know their name until Stripe's page, so a blank field
  // falls back to the first name they enter there
  nameHint: "leave blank and we'll use your first name.",
  anonymousLabel: "keep me anonymous",
  anonymousName: "Anonymous",
};
