"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { naira } from "@/lib/format";
import { ProductImage } from "./ProductImage";

// The bag lives in the browser. It stores a display snapshot only; the server re-prices at checkout.
export type CartLine = {
  productId: number; slug: string; name: string; size: string; unit: number;
  images: string[]; illustration: string; qty: number;
};

type Ctx = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  open: boolean;
  setOpen: (v: boolean) => void;
  add: (line: Omit<CartLine, "qty">, qty?: number) => void;
  addMany: (lines: Omit<CartLine, "qty">[]) => void;
  setQty: (productId: number, qty: number) => void;
  clear: () => void;
};

const CartContext = createContext<Ctx | null>(null);
const KEY = "bd-bag-v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try { setLines(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch { /* private mode */ }
  }, []);
  const persist = useCallback((next: CartLine[]) => {
    setLines(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }, []);

  const value = useMemo<Ctx>(() => ({
    lines,
    count: lines.reduce((s, l) => s + l.qty, 0),
    subtotal: lines.reduce((s, l) => s + l.qty * l.unit, 0),
    open, setOpen,
    add: (line, qty = 1) => {
      const existing = lines.find((l) => l.productId === line.productId);
      persist(existing
        ? lines.map((l) => (l.productId === line.productId ? { ...line, qty: Math.min(20, l.qty + qty) } : l))
        : [...lines, { ...line, qty }]);
      setOpen(true);
    },
    addMany: (adds) => {
      // Adds one of each; products already in the bag keep their quantity.
      const next = [...lines];
      for (const l of adds) if (!next.some((x) => x.productId === l.productId)) next.push({ ...l, qty: 1 });
      persist(next);
      setOpen(true);
    },
    setQty: (id, qty) => persist(qty <= 0 ? lines.filter((l) => l.productId !== id) : lines.map((l) => (l.productId === id ? { ...l, qty: Math.min(20, qty) } : l))),
    clear: () => persist([]),
  }), [lines, open, persist]);

  return <CartContext.Provider value={value}>{children}<CartDrawer /></CartContext.Provider>;
}

export function useCart() {
  const c = useContext(CartContext);
  if (!c) throw new Error("useCart outside CartProvider");
  return c;
}

export function CartButton() {
  const { count, setOpen } = useCart();
  return (
    <button onClick={() => setOpen(true)} className="relative rounded-full p-2 text-green hover:bg-mint" aria-label={`Bag, ${count} items`}>
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5 8h14l-1.2 12H6.2z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>
      {count > 0 && <span className="absolute -top-0.5 -right-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-gold px-1 text-[11px] font-bold text-green-deep">{count}</span>}
    </button>
  );
}

export function QtyStepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="inline-flex items-center overflow-hidden rounded-xl border border-[#cfd8d4] bg-white">
      <button type="button" className="h-10 w-10 text-lg text-green hover:bg-mint" onClick={() => onChange(value - 1)} aria-label="Decrease">−</button>
      <span className="min-w-8 text-center font-semibold">{value}</span>
      <button type="button" className="h-10 w-10 text-lg text-green hover:bg-mint" onClick={() => onChange(value + 1)} aria-label="Increase">+</button>
    </div>
  );
}

function CartDrawer() {
  const { lines, open, setOpen, setQty, subtotal } = useCart();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[rgba(15,30,24,.5)]" onClick={() => setOpen(false)}>
      <aside className="flex h-full w-full max-w-md flex-col bg-white" onClick={(e) => e.stopPropagation()} aria-label="Your bag">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-3xl">Your bag</h2>
          <button onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-full bg-cream text-xl text-muted" aria-label="Close">×</button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {lines.length === 0 && <p className="py-10 text-center text-muted">Your bag is empty.</p>}
          {lines.map((l) => (
            <div key={l.productId} className="flex gap-3 border-b border-line py-3">
              <ProductImage product={l} className="w-20 shrink-0 rounded-xl" />
              <div className="flex-1">
                <Link href={`/products/${l.slug}`} onClick={() => setOpen(false)} className="font-semibold">{l.name}</Link>
                <div className="text-sm text-muted">{l.size}</div>
                <div className="mt-2 flex items-center justify-between">
                  <QtyStepper value={l.qty} onChange={(n) => setQty(l.productId, n)} />
                  <span className="font-semibold">{naira(l.unit * l.qty)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        {lines.length > 0 && (
          <div className="border-t border-line p-5">
            <div className="mb-3 flex justify-between text-lg font-bold text-green-deep"><span>Subtotal</span><span>{naira(subtotal)}</span></div>
            <Link href="/checkout" onClick={() => setOpen(false)} className="btn-primary w-full">Checkout</Link>
            <p className="mt-2 text-center text-xs text-muted">Delivery is calculated at checkout.</p>
          </div>
        )}
      </aside>
    </div>
  );
}
