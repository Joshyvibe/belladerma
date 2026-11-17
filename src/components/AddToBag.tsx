"use client";

import { useState } from "react";
import { useCart, QtyStepper, type CartLine } from "./cart";

export function AddToBag({ line, stock, withQty = false, compact = false, className = "" }:
  { line: Omit<CartLine, "qty">; stock: number; withQty?: boolean; compact?: boolean; className?: string }) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  if (compact) {
    return stock > 0
      ? <button className={`btn-ghost btn-sm shrink-0 ${className}`} onClick={() => add(line, 1)}>+ Add</button>
      : <span className={`shrink-0 text-xs text-muted ${className}`}>Sold out</span>;
  }
  if (stock <= 0) return <button disabled className={`btn-ghost ${className}`}>Sold out</button>;
  return (
    <div className={`flex gap-3 ${className}`}>
      {withQty && <QtyStepper value={qty} onChange={(n) => setQty(Math.max(1, Math.min(stock, n)))} />}
      <button className="btn-primary flex-1" onClick={() => add(line, qty)}>Add to bag</button>
    </div>
  );
}
