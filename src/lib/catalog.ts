import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { Product } from "@/db/schema";
import { unitPrice } from "@/lib/pricing";
import { fileUrl } from "@/lib/storage";
import type { Routine } from "@/lib/routines";

/** Product with image keys turned into browser URLs. */
export const viewProduct = (p: Product) => ({ ...p, images: p.images.map(fileUrl) });
export type ProductView = ReturnType<typeof viewProduct>;

export async function listProducts({ includeInactive = false } = {}) {
  const db = await getDb();
  const rows = await db.select().from(schema.products)
    .where(includeInactive ? undefined : eq(schema.products.active, true))
    .orderBy(asc(schema.products.sort), asc(schema.products.id));
  return rows.map(viewProduct);
}

export async function productBySlug(slug: string) {
  const db = await getDb();
  const [p] = await db.select().from(schema.products)
    .where(and(eq(schema.products.slug, slug), eq(schema.products.active, true)));
  return p ? viewProduct(p) : null;
}

export const cartLine = (p: ProductView) => ({
  productId: p.id, slug: p.slug, name: p.name, size: p.size, unit: unitPrice(p), images: p.images, illustration: p.illustration,
});

/** Turns a routine's product slugs into card data, skipping hidden or missing products. */
export function routineSteps(routine: Routine, products: ProductView[], exclude?: string) {
  return routine.steps.flatMap((s) => {
    const p = products.find((x) => x.slug === s.slug);
    return p && p.slug !== exclude ? [{ step: s.step, when: s.when, line: cartLine(p), stock: p.stock, product: p }] : [];
  });
}
