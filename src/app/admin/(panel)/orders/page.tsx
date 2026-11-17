import Link from "next/link";
import { and, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatDate, naira, normalizePhone } from "@/lib/format";
import type { OrderStatus } from "@/db/schema";

const FILTERS: Record<string, { label: string; statuses?: OrderStatus[] }> = {
  action: { label: "Needs action", statuses: ["AWAITING_CONFIRMATION", "ON_HOLD", "PAID", "PROCESSING"] },
  unpaid: { label: "Unpaid", statuses: ["PENDING_PAYMENT", "AWAITING_TRANSFER", "FAILED", "REJECTED"] },
  shipping: { label: "On the way", statuses: ["DISPATCHED"] },
  done: { label: "Delivered", statuses: ["DELIVERED"] },
  closed: { label: "Cancelled / refunded", statuses: ["CANCELLED", "REFUNDED"] },
  all: { label: "All" },
};

export default async function Orders({ searchParams }: { searchParams: Promise<{ f?: string; q?: string }> }) {
  const { f = "action", q = "" } = await searchParams;
  const filter = FILTERS[f] ?? FILTERS.action;
  const db = await getDb();
  const phone = normalizePhone(q);
  const search = q.trim()
    ? or(ilike(schema.orders.ref, `%${q.trim()}%`), ilike(schema.orders.customerName, `%${q.trim()}%`), phone ? eq(schema.orders.phone, phone) : undefined)
    : undefined;
  const rows = await db.select().from(schema.orders)
    .where(and(filter.statuses ? inArray(schema.orders.status, filter.statuses) : undefined, search))
    .orderBy(desc(schema.orders.createdAt)).limit(200);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-4xl">Orders</h1>
        <form className="flex gap-2">
          <input type="hidden" name="f" value={q ? "all" : f} />
          <input name="q" defaultValue={q} placeholder="Ref, name or phone" className="input py-2 text-sm" />
          <button className="btn-ghost btn-sm">Search</button>
        </form>
      </div>
      <div className="flex flex-wrap gap-2">
        {Object.entries(FILTERS).map(([k, v]) => (
          <Link key={k} href={`/admin/orders?f=${k}`} className={`chip px-3 py-1.5 text-sm ${k === f ? "bg-green text-white" : "border border-line bg-white"}`}>{v.label}</Link>
        ))}
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-cream text-left text-xs tracking-wider text-muted uppercase">
            <tr><th className="px-4 py-3">Order</th><th>Customer</th><th>Deliver to</th><th>Payment</th><th>Total</th><th>Status</th><th>Placed</th></tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id} className="border-t border-line hover:bg-cream">
                <td className="px-4 py-3"><Link href={`/admin/orders/${o.id}`} className="font-semibold underline">{o.ref}</Link></td>
                <td>{o.customerName}<div className="text-xs text-muted">{o.phone}</div></td>
                <td>{o.zoneLabel}<div className="text-xs text-muted">{o.area ?? o.state}</div></td>
                <td>{o.paymentMethod === "online" ? "Online" : "Transfer"}</td>
                <td className="font-semibold">{naira(o.total)}</td>
                <td><StatusBadge status={o.status} /></td>
                <td className="text-xs text-muted">{formatDate(o.createdAt)}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted">No orders here.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
