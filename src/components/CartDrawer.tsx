"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Plate } from "@/content/option16";
import { useCart } from "@/lib/cart";
import { cartCopy as copy } from "@/content/cart";
import StreamShoutoutFields from "@/components/StreamShoutoutFields";
import TipPicker from "@/components/TipPicker";

const plates: Record<Plate, string> = {
  choc: "radial-gradient(circle at 32% 28%,#c98a5e,transparent 55%),linear-gradient(140deg,#6b4429,#4a2c17)",
  straw: "radial-gradient(circle at 30% 30%,#ffd9e2,transparent 55%),linear-gradient(140deg,#f5a9c0,#e06a92)",
  butter: "radial-gradient(circle at 30% 30%,#ffe9b0,transparent 55%),linear-gradient(140deg,#f0c869,#d99a3c)",
  matcha: "radial-gradient(circle at 30% 30%,#d7ecc4,transparent 55%),linear-gradient(140deg,#9cc47b,#5f9e6a)",
};

const prose = "font-sans";
const inputClass = `${prose} w-full mt-1 rounded-full px-4 py-2.5 text-lg text-merrbakes-brown bg-white border border-merrbakes-brown/20 outline-none focus:ring-4 focus:ring-merrbakes-yellow`;

export default function CartDrawer() {
  const { items, isOpen, close, setQuantity, remove, subtotalCents } = useCart();

  // "details" step exists specifically to gate the referral field — it's only
  // offered to people with no prior order on record (checked via
  // /api/customer-lookup), so we need their email before deciding whether to
  // show it at all, rather than asking everyone and discarding it later.
  const [step, setStep] = useState<"cart" | "details">("cart");
  const [email, setEmail] = useState("");
  const [referredBy, setReferredBy] = useState("");
  const [lookup, setLookup] = useState<"idle" | "checking" | "existing" | "new">("idle");
  const [subscribeToList, setSubscribeToList] = useState(true);
  // promo code — the club-week code gives free shipping on variants Merr has
  // marked "Club Week Drop" in Notion; any other code is applied as a Stripe
  // promotion code. Both resolved server-side in /api/checkout
  const [promoCode, setPromoCode] = useState("");
  // gift: recipient's name + optional message; the address either goes in at
  // Stripe as usual, or Merr asks the recipient (e.g. a streamer who won't
  // share their address with a viewer)
  const [isGift, setIsGift] = useState(false);
  const [giftRecipient, setGiftRecipient] = useState("");
  const [giftMessage, setGiftMessage] = useState("");
  const [giftAddressFromMerr, setGiftAddressFromMerr] = useState(false);
  // name for Merr's on-stream alert (see src/lib/streamAlert.ts)
  const [tipCents, setTipCents] = useState(0);
  const [tipNote, setTipNote] = useState("");
  const [streamName, setStreamName] = useState("");
  const [streamAnonymous, setStreamAnonymous] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState("");

  async function checkEmail() {
    if (!email || email.indexOf("@") < 1) return;
    setLookup("checking");
    try {
      const res = await fetch(`/api/customer-lookup?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      setLookup(data.isNewCustomer ? "new" : "existing");
    } catch {
      setLookup("idle");
    }
  }

  async function checkout() {
    if (!email || email.indexOf("@") < 1) { setError(copy.errors.email); return; }
    if (isGift && !giftRecipient.trim()) { setError(copy.errors.giftRecipient); return; }

    // If the lookup hasn't resolved yet, resolve it here. A new customer stops
    // so the referral field can appear before we redirect them away; an
    // existing customer has nothing more to fill in, so carry on to payment.
    let status = lookup;
    if (status === "idle" || status === "checking") {
      setLookup("checking");
      try {
        const res = await fetch(`/api/customer-lookup?email=${encodeURIComponent(email)}`);
        const data = await res.json();
        status = data.isNewCustomer ? "new" : "existing";
      } catch {
        status = "existing"; // fail closed on the referral field, not on checkout itself
      }
      setLookup(status);
      if (status === "new") return;
    }

    setCheckingOut(true);
    setError("");

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
          email,
          referredBy: status === "new" ? referredBy : "",
          promoCode,
          gift: isGift ? { recipientName: giftRecipient, message: giftMessage, addressFromMerr: giftAddressFromMerr } : undefined,
          streamName,
          streamAnonymous,
          tipCents,
          tipNote,
        }),
      });
      const data = await res.json();
      if (data.url) {
        // fire-and-forget — the user is about to be redirected to Stripe, so
        // there's no point (and no time) to wait on this before navigating.
        if (subscribeToList) {
          fetch("/api/join", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          }).catch(() => {});
        }
        window.location.href = data.url;
      } else { setError(data.error && res.status < 500 ? `${data.error}.` : copy.errors.generic); setCheckingOut(false); }
    } catch {
      setError(copy.errors.generic);
      setCheckingOut(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={close} aria-hidden />
      <div className="relative w-full max-w-md h-full bg-merrbakes-pink shadow-xl flex flex-col font-hand">
        <div className="flex items-center justify-between px-5 h-16 border-b border-merrbakes-brown/20">
          <div className="text-2xl font-black">{step === "cart" ? copy.title : copy.detailsTitle}</div>
          <button type="button" onClick={close} aria-label={copy.closeLabel} className="text-2xl px-2 hover:opacity-70">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {step === "cart" ? (
            items.length === 0 ? (
              <p className={`${prose} text-merrbakes-brown/70 text-lg mt-8 text-center`}>{copy.empty}</p>
            ) : (
              <div className="flex flex-col gap-4">
                {items.map((it) => (
                  <div key={it.variantId} className="flex gap-3 items-center">
                    <Link href={`/shop/${it.slug}`} onClick={close}
                       className="w-16 h-16 rounded-xl overflow-hidden relative shrink-0 border border-merrbakes-brown/15 block">
                      {it.photoUrl ? (
                        <Image src={it.photoUrl} alt={it.name} fill sizes="64px" className="object-cover" />
                      ) : (
                        <div className="absolute inset-0 grid place-items-center text-2xl" style={{ background: plates[it.plate ?? "butter"] }}>{it.icon ?? "🍪"}</div>
                      )}
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold truncate">{it.name}</div>
                      <div className={`${prose} text-merrbakes-brown/70 text-sm`}>{it.price} {copy.each}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <button type="button" onClick={() => setQuantity(it.variantId, it.quantity - 1)}
                                className={`${prose} leading-none w-6 h-6 rounded-full border border-merrbakes-brown/40 grid place-items-center hover:border-merrbakes-berry`}><span className="-translate-y-px">−</span></button>
                        <span className={`${prose} w-5 text-center`}>{it.quantity}</span>
                        <button type="button" onClick={() => setQuantity(it.variantId, it.quantity + 1)}
                                className={`${prose} leading-none w-6 h-6 rounded-full border border-merrbakes-brown/40 grid place-items-center hover:border-merrbakes-berry`}><span className="-translate-y-px">+</span></button>
                        <button type="button" onClick={() => remove(it.variantId)}
                                className={`${prose} text-sm text-merrbakes-brown/50 hover:text-merrbakes-berry ml-2 underline`}>{copy.remove}</button>
                      </div>
                    </div>
                    <div className="font-black text-merrbakes-berry shrink-0">${((it.priceCents * it.quantity) / 100).toFixed(2)}</div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="flex flex-col gap-4">
              <p className={`${prose} text-merrbakes-brown/70 text-lg`}>{copy.details.intro}</p>
              <div>
                <label className={`${prose} text-sm font-bold text-merrbakes-brown/70`}>{copy.details.emailLabel}</label>
                <input type="email" value={email} autoComplete="email" placeholder={copy.details.emailPlaceholder}
                       onChange={(e) => { setEmail(e.target.value); setLookup("idle"); }}
                       onBlur={checkEmail}
                       className={inputClass} />
              </div>
              {lookup === "checking" && <p className={`${prose} text-sm text-merrbakes-brown/50`}>{copy.details.checking}</p>}
              <label className={`${prose} flex items-center gap-2 text-sm text-merrbakes-brown/70`}>
                <input type="checkbox" checked={subscribeToList}
                       onChange={(e) => setSubscribeToList(e.target.checked)} />
                {copy.details.subscribeLabel}
              </label>
              {lookup === "new" && (
                <div>
                  <label className={`${prose} text-sm font-bold text-merrbakes-brown/70`}>{copy.details.referralLabel}</label>
                  <input type="text" value={referredBy} placeholder={copy.details.referralPlaceholder}
                         onChange={(e) => setReferredBy(e.target.value)}
                         className={inputClass} />
                </div>
              )}
              <div>
                <label className={`${prose} text-sm font-bold text-merrbakes-brown/70`}>{copy.details.promoLabel}</label>
                <input type="text" value={promoCode} autoCapitalize="none" autoCorrect="off"
                       onChange={(e) => setPromoCode(e.target.value)}
                       className={inputClass} />
              </div>
              <TipPicker
                cents={tipCents} onCentsChange={setTipCents}
                note={tipNote} onNoteChange={setTipNote}
                inputClassName={inputClass}
                labelClassName={`${prose} text-sm font-bold text-merrbakes-brown/70`}
                chipClassName={(on) => `${prose} rounded-full px-3 py-1.5 text-base font-bold border-2 transition ${on ? "bg-merrbakes-berry text-white border-merrbakes-berry" : "bg-white text-merrbakes-brown border-merrbakes-brown/30 hover:border-merrbakes-berry"}`} />
              <StreamShoutoutFields
                name={streamName} onNameChange={setStreamName}
                anonymous={streamAnonymous} onAnonymousChange={setStreamAnonymous}
                inputClassName={inputClass}
                labelClassName={`${prose} text-sm font-bold text-merrbakes-brown/70`}
                hintClassName={`${prose} text-sm text-merrbakes-brown/70`} />
              <label className={`${prose} flex items-center gap-2 text-base font-bold text-merrbakes-brown/80`}>
                <input type="checkbox" checked={isGift} onChange={(e) => setIsGift(e.target.checked)} />
                {copy.gift.toggle}
              </label>
              {isGift && (
                <div className="flex flex-col gap-3 rounded-2xl bg-white/60 p-4">
                  <div>
                    <label className={`${prose} text-sm font-bold text-merrbakes-brown/70`}>{copy.gift.recipientLabel}</label>
                    <input type="text" value={giftRecipient} maxLength={100} placeholder={copy.gift.recipientPlaceholder}
                           onChange={(e) => setGiftRecipient(e.target.value)}
                           className={inputClass} />
                  </div>
                  <fieldset className={`${prose} flex flex-col gap-1.5 text-sm text-merrbakes-brown/80`}>
                    <label className="flex items-start gap-2">
                      <input type="radio" name="gift-address" className="mt-1" checked={!giftAddressFromMerr} onChange={() => setGiftAddressFromMerr(false)} />
                      {copy.gift.addressAtCheckout}
                    </label>
                    <label className="flex items-start gap-2">
                      <input type="radio" name="gift-address" className="mt-1" checked={giftAddressFromMerr} onChange={() => setGiftAddressFromMerr(true)} />
                      {copy.gift.addressFromMerr}
                    </label>
                  </fieldset>
                  <div>
                    <label className={`${prose} text-sm font-bold text-merrbakes-brown/70`}>{copy.gift.messageLabel}</label>
                    <textarea value={giftMessage} maxLength={450} rows={3}
                              onChange={(e) => setGiftMessage(e.target.value)}
                              className={`${inputClass} rounded-2xl resize-none`} />
                  </div>
                </div>
              )}
              <button type="button" onClick={() => setStep("cart")} className={`${prose} text-sm text-merrbakes-brown/60 underline self-start`}>{copy.details.backToCart}</button>
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-merrbakes-brown/20 px-5 py-5">
            <div className="flex items-center justify-between text-xl font-black mb-3">
              <span>{copy.subtotal}</span>
              <span>${(subtotalCents / 100).toFixed(2)}</span>
            </div>
            {error && <p className={`${prose} text-merrbakes-berry text-sm mb-2`}>{error}</p>}
            {step === "cart" ? (
              <button type="button" onClick={() => setStep("details")}
                      className="w-full bg-merrbakes-berry text-white rounded-full py-3 text-xl font-bold hover:opacity-85 transition">
                {copy.checkoutButton}
              </button>
            ) : (
              <button type="button" onClick={checkout} disabled={checkingOut}
                      className="w-full bg-merrbakes-berry text-white rounded-full py-3 text-xl font-bold hover:opacity-85 transition disabled:opacity-60">
                {checkingOut ? copy.redirecting : copy.continueButton}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
