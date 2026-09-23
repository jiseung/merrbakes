"use client";
// Site-wide cart: preorder items only (Stripe Checkout can't mix one-time and
// subscription line items in one session — see merrbakes.md idea 5). Persisted
// to localStorage since there's no user-account system to store it against.
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Plate } from "@/content/option16";

const STORAGE_KEY = "merrbakes-cart";

export type CartItem = {
  variantId: string; // Shop Item Variants Notion page ID — unique line-item identity
  name: string; // pre-formatted display name, e.g. "Morning Buns! — trio of buns"
  slug: string; // the item's /shop/[slug] — note this is the item's slug, not the variant's
  price: string; // display string, e.g. "$10.00"
  priceCents: number;
  photoUrl: string | null;
  icon?: string;
  plate?: Plate;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotalCents: number;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  add: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // load from localStorage once on mount (avoids SSR/hydration mismatch).
  // Validated, not trusted blindly — a cart line saved under a previous
  // schema (e.g. before variantId replaced slug as the line-item key, or
  // before slug was reintroduced as the product-detail-page link) is
  // silently dropped rather than surfacing as a broken, unfixable checkout.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        setItems(parsed.filter((i): i is CartItem => typeof i?.variantId === "string" && typeof i?.slug === "string" && i.quantity > 0));
      }
    } catch {}
    setHydrated(true);

    // a Stripe Checkout redirect back to /shop?checkout=success means payment
    // went through — clear the local cart (the order of record is the webhook,
    // this is just tidying up the client-side cart UI).
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      localStorage.removeItem(STORAGE_KEY);
      params.delete("checkout");
      const rest = params.toString();
      window.history.replaceState(null, "", window.location.pathname + (rest ? `?${rest}` : ""));
    }
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  function add(item: Omit<CartItem, "quantity">, quantity = 1) {
    setItems((prev) => {
      const existing = prev.find((i) => i.variantId === item.variantId);
      if (existing) {
        return prev.map((i) => (i.variantId === item.variantId ? { ...i, quantity: i.quantity + quantity } : i));
      }
      return [...prev, { ...item, quantity }];
    });
  }

  function setQuantity(variantId: string, quantity: number) {
    setItems((prev) =>
      quantity <= 0 ? prev.filter((i) => i.variantId !== variantId) : prev.map((i) => (i.variantId === variantId ? { ...i, quantity } : i))
    );
  }

  function remove(variantId: string) {
    setItems((prev) => prev.filter((i) => i.variantId !== variantId));
  }

  function clear() {
    setItems([]);
  }

  const count = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotalCents = items.reduce((sum, i) => sum + i.priceCents * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, count, subtotalCents, isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false), add, setQuantity, remove, clear }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
