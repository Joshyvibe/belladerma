// Brings the products table in line with src/db/catalog.ts without touching orders or admins.
//   - matches products by slug (and follows RENAMED_SLUGS so renamed products keep their id)
//   - updates name, copy, prices, sizes, photos and category of existing products
//   - keeps each existing product's stock count and visible/hidden switch
//   - inserts products that don't exist yet
// Local PGlite: stop the dev server first (PGlite allows one process). Production: set DATABASE_URL.
import path from "node:path";
import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../src/db/schema";
import { CATALOG, RENAMED_SLUGS } from "../src/db/catalog";
import { DEFAULT_SETTINGS } from "../src/db/seed";

type DB = PostgresJsDatabase<typeof schema>;

async function open(): Promise<{ db: DB; close: () => Promise<void> }> {
  if (process.env.DATABASE_URL) {
    const { default: postgres } = await import("postgres");
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const client = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
    return { db: drizzle(client, { schema }), close: () => client.end() };
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const client = new PGlite(path.join(process.cwd(), ".data", "pglite"));
  return { db: drizzle(client, { schema }) as unknown as DB, close: () => client.close() };
}

const OLD_ANNOUNCEMENT = "☀️ Sale of the week: 20% OFF our SPF 50+ · Delivery across Nigeria";

async function main() {
  const { db, close } = await open();
  try {
    for (const [from, to] of Object.entries(RENAMED_SLUGS)) {
      const [target] = await db.select().from(schema.products).where(eq(schema.products.slug, to));
      if (!target) await db.update(schema.products).set({ slug: to }).where(eq(schema.products.slug, from));
    }
    let added = 0, updated = 0;
    for (const p of CATALOG) {
      const [existing] = await db.select().from(schema.products).where(eq(schema.products.slug, p.slug));
      if (existing) {
        const { stock: _stock, active: _active, ...content } = p;
        void _stock; void _active;
        await db.update(schema.products).set({ ...content, updatedAt: new Date() }).where(eq(schema.products.id, existing.id));
        updated++;
      } else {
        await db.insert(schema.products).values(p);
        added++;
      }
    }
    // Only replace the announcement if nobody has customised it.
    const [ann] = await db.select().from(schema.settings).where(eq(schema.settings.key, "announcement"));
    if (!ann || ann.value === OLD_ANNOUNCEMENT) {
      await db.insert(schema.settings).values({ key: "announcement", value: DEFAULT_SETTINGS.announcement })
        .onConflictDoUpdate({ target: schema.settings.key, set: { value: DEFAULT_SETTINGS.announcement } });
    }
    const all = await db.select({ slug: schema.products.slug, active: schema.products.active }).from(schema.products);
    const extra = all.filter((r) => !CATALOG.some((p) => p.slug === r.slug)).map((r) => r.slug);
    console.log(`Catalogue synced: ${updated} updated, ${added} added, ${all.length} products in total.`);
    if (extra.length) console.log(`Not in the catalogue file (left as they are): ${extra.join(", ")}`);
  } finally {
    await close();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
