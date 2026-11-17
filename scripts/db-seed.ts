// Production seeding against DATABASE_URL (Supabase). Run once after `npm run db:migrate`.
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../src/db/schema";
import { seed } from "../src/db/seed";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
if (!email || !password || password === "changeme123") throw new Error("Set ADMIN_EMAIL and a real ADMIN_PASSWORD");

async function main() {
  const client = postgres(url!, { prepare: false, max: 1 });
  const created = await seed(drizzle(client, { schema }), { adminEmail: email!, adminPassword: password! });
  console.log(created ? `Seeded. Log in as ${email}` : "Database already has an admin; nothing seeded.");
  await client.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
