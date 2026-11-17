import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { viewProduct } from "@/lib/catalog";
import { ProductForm } from "../ProductForm";

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const db = await getDb();
  const [p] = await db.select().from(schema.products).where(eq(schema.products.id, Number((await params).id)));
  if (!p) notFound();
  return (
    <div className="space-y-4">
      <Link href="/admin/products" className="text-sm text-muted">← Products</Link>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-4xl">{p.name}</h1>
        {p.active && <Link href={`/products/${p.slug}`} target="_blank" className="btn-ghost btn-sm">View in shop ↗</Link>}
      </div>
      <ProductForm product={viewProduct(p)} imageKeys={p.images} />
    </div>
  );
}
