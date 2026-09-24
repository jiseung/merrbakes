"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Plate } from "@/content/option16";
import { useCart } from "@/lib/cart";

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
    if (!email || email.indexOf("@") < 1) { setError("enter your email to continue."); return; }

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
      } else { setError("something went wrong starting checkout — try again in a moment."); setCheckingOut(false); }
    } catch {
      setError("something went wrong starting checkout — try again in a moment.");
      setCheckingOut(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={close} aria-hidden />
      <div className="relative w-full max-w-md h-full bg-merrbakes-pink shadow-xl flex flex-col font-hand">
        <div className="flex items-center justify-between px-5 h-16 border-b border-merrbakes-brown/20">
          <div className="text-2xl font-black">{step === "cart" ? "your cart" : "almost there"}</div>
          <button type="button" onClick={close} aria-label="close cart" className="text-2xl px-2 hover:opacity-70">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {step === "cart" ? (
            items.length === 0 ? (
              <p className={`${prose} text-merrbakes-brown/70 text-lg mt-8 text-center`}>Oh no, your cart is empty! It definitely needs something tasty from the menu.</p>
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
                      <div className={`${prose} text-merrbakes-brown/70 text-sm`}>{it.price} each</div>
                      <div className="flex items-center gap-2 mt-1">
                        <button type="button" onClick={() => setQuantity(it.variantId, it.quantity - 1)}
                                className={`${prose} leading-none w-6 h-6 rounded-full border border-merrbakes-brown/40 grid place-items-center hover:border-merrbakes-berry`}><span className="-translate-y-px">−</span></button>
                        <span className={`${prose} w-5 text-center`}>{it.quantity}</span>
                        <button type="button" onClick={() => setQuantity(it.variantId, it.quantity + 1)}
                                className={`${prose} leading-none w-6 h-6 rounded-full border border-merrbakes-brown/40 grid place-items-center hover:border-merrbakes-berry`}><span className="-translate-y-px">+</span></button>
                        <button type="button" onClick={() => remove(it.variantId)}
                                className={`${prose} text-sm text-merrbakes-brown/50 hover:text-merrbakes-berry ml-2 underline`}>remove</button>
                      </div>
                    </div>
                    <div className="font-black text-merrbakes-berry shrink-0">${((it.priceCents * it.quantity) / 100).toFixed(2)}</div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="flex flex-col gap-4">
              <p className={`${prose} text-merrbakes-brown/70 text-lg`}>just need your email before payment.</p>
              <div>
                <label className={`${prose} text-sm font-bold text-merrbakes-brown/70`}>email</label>
                <input type="email" value={email} autoComplete="email" placeholder="you@email.com"
                       onChange={(e) => { setEmail(e.target.value); setLookup("idle"); }}
                       onBlur={checkEmail}
                       className={inputClass} />
              </div>
              {lookup === "checking" && <p className={`${prose} text-sm text-merrbakes-brown/50`}>checking…</p>}
              <label className={`${prose} flex items-center gap-2 text-sm text-merrbakes-brown/70`}>
                <input type="checkbox" checked={subscribeToList}
                       onChange={(e) => setSubscribeToList(e.target.checked)} />
                subscribe to email list
              </label>
              {lookup === "new" && (
                <div>
                  <label className={`${prose} text-sm font-bold text-merrbakes-brown/70`}>who referred you? (optional)</label>
                  <input type="text" value={referredBy} placeholder="their name"
                         onChange={(e) => setReferredBy(e.target.value)}
                         className={inputClass} />
                </div>
              )}
              <button type="button" onClick={() => setStep("cart")} className={`${prose} text-sm text-merrbakes-brown/60 underline self-start`}>← back to cart</button>
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-merrbakes-brown/20 px-5 py-5">
            <div className="flex items-center justify-between text-xl font-black mb-3">
              <span>subtotal</span>
              <span>${(subtotalCents / 100).toFixed(2)}</span>
            </div>
            {error && <p className={`${prose} text-merrbakes-berry text-sm mb-2`}>{error}</p>}
            {step === "cart" ? (
              <button type="button" onClick={() => setStep("details")}
                      className="w-full bg-merrbakes-berry text-white rounded-full py-3 text-xl font-bold hover:opacity-85 transition">
                checkout →
              </button>
            ) : (
              <button type="button" onClick={checkout} disabled={checkingOut}
                      className="w-full bg-merrbakes-berry text-white rounded-full py-3 text-xl font-bold hover:opacity-85 transition disabled:opacity-60">
                {checkingOut ? "redirecting…" : "continue →"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
