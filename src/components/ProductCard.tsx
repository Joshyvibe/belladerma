import Link from "next/link";
import type { ProductView } from "@/lib/catalog";
import { CONCERN_LABELS, naira } from "@/lib/format";
import { unitPrice } from "@/lib/pricing";
import { AddToBag } from "./AddToBag";
import { ProductImage } from "./ProductImage";

export function ProductCard({ p, line }: { p: ProductView; line: Parameters<typeof AddToBag>[0]["line"] }) {
  const price = unitPrice(p);
  const off = price < p.price ? Math.round((1 - price / p.price) * 100) : 0;
  return (
    <div className="card flex flex-col overflow-hidden">
      <Link href={`/products/${p.slug}`} className="relative block">
        <ProductImage product={p} />
        <div className="absolute top-3 left-3 flex gap-1.5">
          {p.badge && <span className="chip bg-green text-white">{p.badge}</span>}
          {off > 0 && <span className="chip bg-gold text-green-deep">−{off}%</span>}
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <div className="eyebrow text-[11px]">{CONCERN_LABELS[p.concern]}{p.size && !p.size.includes("TBC") ? ` · ${p.size}` : ""}</div>
        <Link href={`/products/${p.slug}`}><h3 className="mt-1 text-2xl">{p.name}</h3></Link>
        <p className="mt-1 flex-1 text-sm text-muted">{p.tagline}</p>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-lg font-bold text-green-deep">{naira(price)}</span>
          {off > 0 && <span className="text-sm text-muted line-through">{naira(p.price)}</span>}
        </div>
        <AddToBag line={line} stock={p.stock} className="mt-3" />
      </div>
    </div>
  );
}
