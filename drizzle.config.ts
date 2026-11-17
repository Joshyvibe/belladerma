import { defineConfig } from "drizzle-kit";

// drizzle-kit doesn't read Next's env files, so load .env.local when it exists.
try { process.loadEnvFile(".env.local"); } catch { /* no file: rely on the shell environment */ }

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  // For Supabase, migrate through the session pooler (port 5432) or the direct connection.
  // MIGRATION_DATABASE_URL wins if set; the app itself can use the transaction pooler (6543).
  dbCredentials: { url: process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL || "" },
});
