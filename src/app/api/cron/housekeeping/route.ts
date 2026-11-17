import { NextResponse } from "next/server";
import { and, inArray, isNull, lt, or, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { transition } from "@/lib/orders";
import { remindAdmins } from "@/lib/notify";

// Run hourly from the host's cron (Vercel Cron / Netlify scheduled function / cron-job.org):
//   GET /api/cron/housekeeping  with header  Authorization: Bearer $CRON_SECRET
// It also keeps a free Supabase project from pausing.
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }
  const db = await getDb();
  const h = (n: number) => new Date(Date.now() - n * 3600_000);

  // 1. Unpaid orders older than 48h are cancelled.
  const stale = await db.select({ id: schema.orders.id }).from(schema.orders).where(and(
    inArray(schema.orders.status, ["PENDING_PAYMENT", "AWAITING_TRANSFER", "FAILED"]),
    lt(schema.orders.createdAt, h(48)),
  ));
  for (const o of stale) await transition(o.id, "CANCELLED", "system", { note: "No payment after 48 hours" });

  // 2. Transfers waiting for an admin for 12h+ get a reminder, at most every 12h.
  const waiting = await db.select().from(schema.orders).where(and(
    eq(schema.orders.status, "AWAITING_CONFIRMATION"),
    lt(schema.orders.transferClaimedAt, h(12)),
    or(isNull(schema.orders.remindedAt), lt(schema.orders.remindedAt, h(12))),
  ));
  for (const o of waiting) {
    await remindAdmins(o);
    await db.update(schema.orders).set({ remindedAt: new Date() }).where(eq(schema.orders.id, o.id));
  }

  return NextResponse.json({ cancelled: stale.length, reminded: waiting.length });
}
