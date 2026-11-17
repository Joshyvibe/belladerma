import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { DeliveryNote } from "@/components/DeliveryNote";
import { PrintButton } from "@/components/PrintButton";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatDate, naira, prettyPhone, STATUS_LABELS, waLink } from "@/lib/format";
import { allowedNext, getOrder } from "@/lib/orders";
import { getSettings } from "@/lib/settings";
import { fileUrl } from "@/lib/storage";
import { orderUrl } from "@/lib/tokens";
import { addNoteAction, confirmPaymentAction, rejectPaymentAction, setStatusAction } from "../../../actions";
import { SubmitButton } from "@/components/Loading";

const REJECT_REASONS = ["payment not received", "amount is less than the order total", "narration/ref doesn't match"];

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const order = await getOrder({ id: Number((await params).id) });
  if (!order) notFound();
  const db = await getDb();
  const [items, events, settings] = await Promise.all([
    db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, order.id)),
    db.select().from(schema.orderEvents).where(eq(schema.orderEvents.orderId, order.id)).orderBy(desc(schema.orderEvents.createdAt)),
    getSettings(),
  ]);
  const next = allowedNext(order.status);
  const needsConfirm = ["AWAITING_CONFIRMATION", "AWAITING_TRANSFER", "REJECTED", "ON_HOLD"].includes(order.status);
  const paid = ["PAID", "PROCESSING", "DISPATCHED", "DELIVERED"].includes(order.status);
  const buyerLink = orderUrl(order.ref);

  return (
    <div className="space-y-5">
      <div className="no-print flex flex-wrap items-center gap-3">
        <Link href="/admin/orders" className="text-sm text-muted">← Orders</Link>
        <h1 className="text-4xl">{order.ref}</h1>
        <StatusBadge status={order.status} />
        <span className="text-sm text-muted">placed {formatDate(order.createdAt)}</span>
      </div>

      <div className="no-print grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          {needsConfirm && order.paymentMethod === "transfer" && (
            <section className="card border-gold bg-gold-soft/40 p-5">
              <h2 className="text-2xl">Confirm bank transfer</h2>
              <p className="mt-1 text-sm">Open the company bank app and look for <b>{naira(order.total)}</b> with narration <b>{order.ref}</b> from <b>{order.customerName}</b>.</p>
              {order.receiptPath && <p className="mt-2 text-sm">Receipt: <a className="underline" href={fileUrl(order.receiptPath)} target="_blank" rel="noopener">view upload ↗</a></p>}
              {order.transferClaimedAt && <p className="mt-1 text-xs text-muted">Buyer said they paid {formatDate(order.transferClaimedAt)}</p>}
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <form action={confirmPaymentAction.bind(null, order.id)}>
                  <SubmitButton className="btn-primary w-full" pendingText="Confirming…">✓ Payment received, confirm</SubmitButton>
                </form>
                {order.status !== "REJECTED" && order.status !== "AWAITING_TRANSFER" && (
                  <form action={rejectPaymentAction.bind(null, order.id)} className="space-y-2">
                    <select name="reason" className="input py-2 text-sm">
                      {REJECT_REASONS.map((r) => <option key={r}>{r}</option>)}
                      <option value="other">Other…</option>
                    </select>
                    <input name="other" placeholder="Other reason (shown to buyer)" className="input py-2 text-sm" />
                    <SubmitButton className="btn-danger w-full" pendingText="Rejecting…">Reject & tell buyer</SubmitButton>
                  </form>
                )}
              </div>
            </section>
          )}

          {paid && order.status !== "DELIVERED" && (
            <section className="card p-5">
              <h2 className="text-2xl">Fulfilment</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {next.includes("PROCESSING") && (
                  <form action={setStatusAction.bind(null, order.id)}><input type="hidden" name="to" value="PROCESSING" /><SubmitButton className="btn-ghost w-full" pendingText="Updating…">Mark as being packed</SubmitButton></form>
                )}
                {next.includes("DELIVERED") && (
                  <form action={setStatusAction.bind(null, order.id)}><input type="hidden" name="to" value="DELIVERED" /><SubmitButton className="btn-primary w-full" pendingText="Updating…">Mark delivered</SubmitButton></form>
                )}
              </div>
              {next.includes("DISPATCHED") && (
                <form action={setStatusAction.bind(null, order.id)} className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <input type="hidden" name="to" value="DISPATCHED" />
                  <input name="courier" placeholder="Courier / rider (e.g. GIG, Kwik)" className="input py-2 text-sm" />
                  <input name="tracking" placeholder="Tracking no. (optional)" className="input py-2 text-sm" />
                  <SubmitButton className="btn-primary btn-sm" pendingText="Dispatching…">Dispatch & notify</SubmitButton>
                </form>
              )}
            </section>
          )}

          <section className="card p-5">
            <h2 className="text-2xl">Items</h2>
            <div className="mt-2 divide-y divide-line text-sm">
              {items.map((i) => <div key={i.id} className="flex justify-between py-2"><span>{i.name} {i.size && <span className="text-muted">· {i.size}</span>} × {i.qty}</span><span>{naira(i.unitPrice * i.qty)}</span></div>)}
              <div className="flex justify-between py-2"><span>Delivery · {order.zoneLabel}</span><span>{order.deliveryFee ? naira(order.deliveryFee) : "Free"}</span></div>
              <div className="flex justify-between py-2 font-bold text-green-deep"><span>Total</span><span>{naira(order.total)}</span></div>
            </div>
          </section>

          <section className="card p-5">
            <h2 className="text-2xl">Activity</h2>
            <form action={addNoteAction.bind(null, order.id)} className="mt-3 flex gap-2">
              <input name="note" placeholder="Add an internal note" className="input py-2 text-sm" />
              <SubmitButton className="btn-ghost btn-sm" pendingText="Adding…">Add</SubmitButton>
            </form>
            <ol className="mt-3 space-y-2 text-sm">
              {events.map((e) => (
                <li key={e.id} className="border-l-2 border-line pl-3">
                  <div className="text-xs text-muted">{formatDate(e.createdAt)} · {e.actor}</div>
                  {e.type === "status"
                    ? <div><b>{e.fromStatus ? `${STATUS_LABELS[e.fromStatus]?.label} → ` : ""}{STATUS_LABELS[e.toStatus ?? ""]?.label}</b>{e.note && ` · ${e.note}`}</div>
                    : <div className={e.type === "notification" ? "text-muted" : ""}>{e.type === "notification" ? "📨 " : e.type === "note" ? "📝 " : ""}{e.note}</div>}
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="card p-5 text-sm">
            <h2 className="text-2xl">Customer</h2>
            <p className="mt-2 font-semibold">{order.customerName}</p>
            <p><a className="underline" href={waLink(order.phone, `Hi ${order.customerName.split(" ")[0]}, this is Belladerma about your order ${order.ref}.`)} target="_blank" rel="noopener">{prettyPhone(order.phone)} (WhatsApp)</a></p>
            {order.email && <p>{order.email}</p>}
            <p className="mt-3 text-muted">Deliver to</p>
            <p>{order.address}{order.area ? `, ${order.area}` : ""}, {order.state}</p>
            <p className="mt-1">{order.zoneLabel} · {order.eta}</p>
          </section>
          <section className="card p-5 text-sm">
            <h2 className="text-2xl">Payment</h2>
            <p className="mt-2">{order.paymentMethod === "online" ? `Online · ${order.provider ?? "—"}` : "Bank transfer"}</p>
            {order.providerRef && <p className="text-muted">Ref {order.providerRef}</p>}
            {order.paidAt && <p>Paid {formatDate(order.paidAt)}{order.confirmedBy ? ` · confirmed by ${order.confirmedBy}` : ""}</p>}
            <p className="mt-3 break-all text-xs text-muted">Buyer&apos;s order link: <a className="underline" href={buyerLink} target="_blank" rel="noopener">{buyerLink}</a></p>
          </section>
          {next.some((s) => ["CANCELLED", "REFUNDED"].includes(s)) && (
            <section className="card p-5 text-sm">
              <h2 className="text-2xl">Other actions</h2>
              <form action={setStatusAction.bind(null, order.id)} className="mt-3 space-y-2">
                <select name="to" className="input py-2 text-sm">
                  {next.filter((s) => ["CANCELLED", "REFUNDED", "PAID"].includes(s)).map((s) => <option key={s} value={s}>{STATUS_LABELS[s].label}</option>)}
                </select>
                <input name="note" placeholder="Reason (internal)" className="input py-2 text-sm" />
                <SubmitButton className="btn-ghost btn-sm w-full" pendingText="Updating…">Update status</SubmitButton>
              </form>
              <p className="mt-2 text-xs text-muted">Refunds are made outside the shop (bank or gateway dashboard). This only records it.</p>
            </section>
          )}
        </aside>
      </div>

      {paid && (
        <section>
          <div className="no-print mb-3 flex items-center justify-between"><h2 className="text-2xl">Delivery note</h2><PrintButton /></div>
          <DeliveryNote order={order} items={items} settings={settings} />
        </section>
      )}
    </div>
  );
}
