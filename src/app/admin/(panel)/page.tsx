import Link from "next/link";
import { and, desc, gte, inArray, lte, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatDate, naira } from "@/lib/format";

const PAID = ["PAID", "PROCESSING", "DISPATCHED", "DELIVERED"] as const;

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const db = await getDb();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const month = new Date(today.getFullYear(), today.getMonth(), 1);

  const [[todayStats], [monthStats], toConfirm, toShip, lowStock] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int`, sum: sql<number>`coalesce(sum(${schema.orders.total}),0)::int` })
      .from(schema.orders).where(and(inArray(schema.orders.status, [...PAID]), gte(schema.orders.paidAt, today))),
    db.select({ n: sql<number>`count(*)::int`, sum: sql<number>`coalesce(sum(${schema.orders.total}),0)::int` })
      .from(schema.orders).where(and(inArray(schema.orders.status, [...PAID]), gte(schema.orders.paidAt, month))),
    db.select().from(schema.orders).where(inArray(schema.orders.status, ["AWAITING_CONFIRMATION", "ON_HOLD"])).orderBy(desc(schema.orders.updatedAt)),
    db.select().from(schema.orders).where(inArray(schema.orders.status, ["PAID", "PROCESSING"])).orderBy(schema.orders.paidAt),
    db.select().from(schema.products).where(lte(schema.products.stock, schema.products.lowStockAt)),
  ]);

  return (
    <div className="space-y-6">
      {error === "owner-only" && <p className="rounded-xl bg-gold-soft p-3 text-sm text-gold-ink">Only the owner can open that page.</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Paid today" value={naira(todayStats.sum)} sub={`${todayStats.n} orders`} />
        <Stat label="This month" value={naira(monthStats.sum)} sub={`${monthStats.n} orders`} />
        <Stat label="Payments to confirm" value={String(toConfirm.length)} sub="bank transfers & holds" alert={toConfirm.length > 0} />
        <Stat label="To pack & ship" value={String(toShip.length)} sub="paid, not dispatched" />
      </div>

      <Panel title="Confirm these payments" empty="Nothing waiting. 🎉" rows={toConfirm} />
      <Panel title="Ready to pack & dispatch" empty="No paid orders waiting." rows={toShip} />

      {lowStock.length > 0 && (
        <section className="card p-5">
          <h2 className="text-2xl">Low stock</h2>
          <ul className="mt-2 text-sm">
            {lowStock.map((p) => <li key={p.id} className="flex justify-between border-t border-line py-2"><Link href={`/admin/products/${p.id}`} className="underline">{p.name}</Link><span className={p.stock === 0 ? "text-danger" : ""}>{p.stock} left</span></li>)}
          </ul>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, sub, alert }: { label: string; value: string; sub: string; alert?: boolean }) {
  return (
    <div className={`card p-4 ${alert ? "border-gold bg-gold-soft" : ""}`}>
      <div className="text-xs font-semibold tracking-wider text-muted uppercase">{label}</div>
      <div className="mt-1 text-2xl font-bold text-green-deep">{value}</div>
      <div className="text-xs text-muted">{sub}</div>
    </div>
  );
}

function Panel({ title, rows, empty }: { title: string; rows: (typeof schema.orders.$inferSelect)[]; empty: string }) {
  return (
    <section className="card p-5">
      <h2 className="text-2xl">{title}</h2>
      {rows.length === 0 ? <p className="mt-2 text-sm text-muted">{empty}</p> : (
        <div className="mt-2 divide-y divide-line text-sm">
          {rows.map((o) => (
            <Link key={o.id} href={`/admin/orders/${o.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 hover:bg-cream">
              <span className="font-semibold sm:w-32">{o.ref}</span>
              <span className="min-w-40 flex-1">{o.customerName} · {o.area ?? o.state}</span>
              <span className="font-semibold">{naira(o.total)}</span>
              <StatusBadge status={o.status} />
              <span className="text-xs text-muted sm:w-36">{formatDate(o.updatedAt)}</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
