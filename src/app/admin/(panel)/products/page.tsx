import Link from "next/link";
import { ProductImage } from "@/components/ProductImage";
import { listProducts } from "@/lib/catalog";
import { CONCERN_LABELS, naira } from "@/lib/format";

export default async function Products({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  const products = await listProducts({ includeInactive: true });
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl">Products</h1>
        <Link href="/admin/products/new" className="btn-primary btn-sm">+ Add product</Link>
      </div>
      {saved && <p className="rounded-xl bg-mint p-3 text-sm text-green-deep">Saved. The shop is updated.</p>}
      <div className="card divide-y divide-line">
        {products.map((p) => (
          <Link key={p.id} href={`/admin/products/${p.id}`} className="flex items-center gap-4 p-3 hover:bg-cream">
            <ProductImage product={p} className="w-14 shrink-0 rounded-lg" />
            <div className="flex-1">
              <div className="font-semibold">{p.name} {!p.active && <span className="chip ml-1 bg-line text-muted">Hidden</span>}{p.featured && <span className="chip ml-1 bg-gold-soft text-gold-ink">Featured</span>}</div>
              <div className="text-xs text-muted">{CONCERN_LABELS[p.concern]} · {p.size || "size TBC"}</div>
            </div>
            <div className="text-right text-sm">
              <div className="font-semibold">{naira(p.salePrice ?? p.price)}{p.salePrice != null && <span className="ml-1 text-xs text-muted line-through">{naira(p.price)}</span>}</div>
              <div className={`text-xs ${p.stock <= p.lowStockAt ? "text-danger" : "text-muted"}`}>{p.stock} in stock</div>
            </div>
          </Link>
        ))}
      </div>
      <p className="text-sm text-muted">Only products seen in Belladerma&apos;s public posts are listed so far. Add the rest of the range here.</p>
    </div>
  );
}
