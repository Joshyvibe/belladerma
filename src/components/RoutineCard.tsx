"use client";

import Link from "next/link";
import { naira } from "@/lib/format";
import { useCart, type CartLine } from "./cart";
import { ProductImage } from "./ProductImage";

export type RoutineStepView = { step: string; when: string; line: Omit<CartLine, "qty">; stock: number };

export function RoutineCard({ title, blurb, steps }: { title: string; blurb: string; steps: RoutineStepView[] }) {
  const { addMany } = useCart();
  const inStock = steps.filter((s) => s.stock > 0);
  const total = inStock.reduce((sum, s) => sum + s.line.unit, 0);
  return (
    <div className="card flex min-w-0 flex-col p-5">
      <h3 className="text-3xl">{title}</h3>
      <p className="mt-1 text-sm text-muted">{blurb}</p>
      <ol className="mt-4 flex-1 space-y-3">
        {steps.map((s, i) => (
          <li key={s.line.productId} className="flex items-center gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-green text-xs font-bold text-white">{i + 1}</span>
            <Link href={`/products/${s.line.slug}`} className="shrink-0"><ProductImage product={s.line} className="w-12 rounded-lg" /></Link>
            <div className="min-w-0 flex-1 text-sm">
              <div className="text-[11px] font-semibold tracking-wider text-green-soft uppercase">{s.step} · {s.when}</div>
              <Link href={`/products/${s.line.slug}`} className="block truncate font-semibold">{s.line.name}</Link>
            </div>
            <span className="text-sm font-semibold whitespace-nowrap">{s.stock > 0 ? naira(s.line.unit) : "Sold out"}</span>
          </li>
        ))}
      </ol>
      <button className="btn-primary mt-5 w-full" disabled={!inStock.length} onClick={() => addMany(inStock.map((s) => s.line))}>
        Add routine to bag · {naira(total)}
      </button>
    </div>
  );
}
