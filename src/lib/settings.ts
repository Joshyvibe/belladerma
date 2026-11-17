import "server-only";
import { getDb, schema } from "@/db";
import { DEFAULT_SETTINGS } from "@/db/seed";

export type Settings = typeof DEFAULT_SETTINGS;

export async function getSettings(): Promise<Settings> {
  const db = await getDb();
  const rows = await db.select().from(schema.settings);
  const out = structuredClone(DEFAULT_SETTINGS) as Record<string, unknown>;
  for (const r of rows) out[r.key] = r.value;
  return out as Settings;
}

export async function saveSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  const db = await getDb();
  await db.insert(schema.settings).values({ key, value })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value } });
}
