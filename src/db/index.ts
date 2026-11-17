import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

export type DB = PostgresJsDatabase<typeof schema>;

const MIGRATIONS = path.join(process.cwd(), "drizzle");

// Cached on globalThis so dev hot-reloads don't open a second PGlite on the same folder.
const g = globalThis as unknown as { __bdDb?: Promise<DB> };

// `next dev` + Supabase's pooler hangs on queries (the production build doesn't), so local dev
// uses the embedded database unless USE_REMOTE_DB_IN_DEV=1 is set.
export const remoteDbEnabled = () =>
  !!process.env.DATABASE_URL && (process.env.NODE_ENV !== "development" || process.env.USE_REMOTE_DB_IN_DEV === "1");

async function connect(): Promise<DB> {
  if (remoteDbEnabled()) {
    const { default: postgres } = await import("postgres");
    const { drizzle } = await import("drizzle-orm/postgres-js");
    // prepare: false is required by Supabase's transaction pooler. The pooler silently drops idle
    // connections, so close ours first and recycle them, or requests hang on a dead socket.
    const client = postgres(process.env.DATABASE_URL!, {
      prepare: false, max: 5, idle_timeout: 20, max_lifetime: 60 * 30, connect_timeout: 10,
    });
    return drizzle(client, { schema });
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dir = process.env.PGLITE_DIR || path.join(process.cwd(), ".data", "pglite");
  fs.mkdirSync(path.dirname(dir), { recursive: true });
  const client = new PGlite(dir);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS });
  // Local dev: an empty database gets demo products, zones and the first admin automatically.
  const { seed } = await import("./seed");
  await seed(db as unknown as DB, {
    adminEmail: process.env.ADMIN_EMAIL || "admin@belladerma.test",
    adminPassword: process.env.ADMIN_PASSWORD || "changeme123",
  });
  return db as unknown as DB;
}

export function getDb(): Promise<DB> {
  g.__bdDb ??= connect().catch((e) => {
    g.__bdDb = undefined; // let the next request retry instead of caching the failure
    throw e;
  });
  return g.__bdDb;
}

export { schema };
