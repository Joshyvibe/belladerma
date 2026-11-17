import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { formatDate, naira, STATUS_LABELS, waLink } from "@/lib/format";
import { getOrder } from "@/lib/orders";
import { getSettings } from "@/lib/settings";
import { checkOrderToken } from "@/lib/tokens";
import { isDemoMode } from "@/lib/payments";
import { claimTransferAction, retryOnlineAction, switchToTransferAction } from "./actions";
import { CopyButton, TransferForm } from "./TransferForm";
import { SubmitButton } from "@/components/Loading";

export const metadata = { title: "Your order", robots: { index: false } };

const STEPS = ["Placed", "Paid", "Packed", "On the way", "Delivered"];
const stepOf: Record<string, number> = { PAID: 1, PROCESSING: 2, DISPATCHED: 3, DELIVERED: 4 };

export default async function OrderPage({ params, searchParams }: {
  params: Promise<{ ref: string }>; searchParams: Promise<{ t?: string; payerror?: string }>;
}) {
  const { ref } = await params;
  const { t, payerror } = await searchParams;
  if (!checkOrderToken(ref, t)) notFound();
  const order = await getOrder({ ref });
  if (!order) notFound();
  const db = await getDb();
  const [items, s, events] = await Promise.all([
    db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, order.id)),
    getSettings(),
    db.select().from(schema.orderEvents).where(eq(schema.orderEvents.orderId, order.id)).orderBy(asc(schema.orderEvents.createdAt)),
  ]);
  const demo = isDemoMode();
  const st = STATUS_LABELS[order.status];
  const step = stepOf[order.status] ?? 0;
  const help = waLink(s.store.whatsapp, `Hi Belladerma, I need help with order ${order.ref}`);
  const rejectReason = order.status === "REJECTED" ? events.filter((e) => e.toStatus === "REJECTED").at(-1)?.note : null;

  return (
    <div className="wrap max-w-3xl py-8 md:py-12">
      <div className="eyebrow">Order {order.ref}</div>
      <h1 className="mt-2 text-4xl md:text-5xl">
        {order.status === "AWAITING_TRANSFER" ? "Complete your transfer"
          : order.status === "AWAITING_CONFIRMATION" ? "We're confirming your payment"
          : step > 0 ? `Thank you, ${order.customerName.split(" ")[0]}!` : st.label}
      </h1>
      <span className={`chip mt-3 ${st.tone === "ok" ? "bg-mint text-green-deep" : st.tone === "bad" ? "bg-red-50 text-danger" : st.tone === "info" ? "bg-mint text-green" : "bg-gold-soft text-gold-ink"}`}>{st.label}</span>

      {step > 0 && (
        <ol className="mt-6 grid grid-cols-5 gap-1 text-center text-[11px] text-muted">
          {STEPS.map((label, i) => (
            <li key={label}><div className={`mb-1 h-1.5 rounded ${i <= step ? "bg-green" : "bg-line"}`} />{label}</li>
          ))}
        </ol>
      )}

      {payerror && <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-danger">We couldn&apos;t open the payment page. Try again, or pay by bank transfer instead.</p>}

      {(order.status === "AWAITING_TRANSFER" || order.status === "REJECTED") && (
        <section className="card mt-6 p-5">
          {rejectReason && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-danger">We couldn&apos;t confirm your last transfer: {rejectReason}. If you&apos;ve paid, upload your receipt below or <a className="underline" href={help}>chat with us</a>.</p>}
          <p className="mb-4 rounded-xl bg-gold-soft p-3 text-sm text-gold-ink">Use <b>{order.ref}</b> as the transfer narration so we can match your payment.</p>
          <dl className="divide-y divide-line rounded-xl border border-line text-sm">
            {[["Amount", naira(order.total), String(order.total)], ["Bank", s.bank.bank], ["Account name", s.bank.accountName],
              ["Account number", s.bank.accountNumber, s.bank.accountNumber], ["Narration", order.ref, order.ref]].map(([k, v, copy]) => (
              <div key={k} className="flex items-center justify-between gap-3 px-4 py-3">
                <dt className="text-muted">{k}</dt><dd className="flex items-center gap-3 font-semibold">{v}{copy && <CopyButton text={copy} />}</dd>
              </div>
            ))}
          </dl>
          {demo && (
            <p className="mt-4 rounded-xl border border-dashed border-green-soft bg-mint/40 p-3 text-sm text-green-deep">
              <b>Demo walkthrough:</b> no real transfer is needed. Tap <b>&quot;I&apos;ve made the transfer&quot;</b> below to see what happens next: the buyer is told we&apos;re confirming, and the admin gets an alert to confirm the payment.
            </p>
          )}
          <div className="mt-4"><TransferForm action={claimTransferAction.bind(null, order.ref, t!)} /></div>
        </section>
      )}

      {order.status === "AWAITING_CONFIRMATION" && (
        <section className="card mt-6 p-5 text-sm">
          <p>Thanks! We&apos;ve told our team. They&apos;ll check for your transfer of <b>{naira(order.total)}</b> and confirm, usually within {s.transferConfirmHours} hours. You&apos;ll get a WhatsApp message{order.email ? " and an email" : ""} when it&apos;s confirmed.</p>
          {demo && (
            <p className="mt-3 rounded-xl border border-dashed border-green-soft bg-mint/40 p-3 text-green-deep">
              <b>Demo walkthrough, next step:</b> open <a className="underline" href="/admin/orders" target="_blank" rel="noopener">Admin → Orders</a> (or tap the link in the admin alert email), open <b>{order.ref}</b> and click <b>&quot;Payment received, confirm&quot;</b>. Then refresh this page: it switches to <b>Paid</b> with a printable delivery note.
            </p>
          )}
        </section>
      )}

      {(order.status === "PENDING_PAYMENT" || order.status === "FAILED") && (
        <section className="card mt-6 space-y-3 p-5">
          <p className="text-sm">{order.status === "FAILED" ? "Your payment didn't go through." : "We haven't received your payment yet."}</p>
          {!demo && <form action={retryOnlineAction.bind(null, order.ref, t!)}><SubmitButton className="btn-primary w-full" pendingText="Opening payment…">Pay {naira(order.total)} online</SubmitButton></form>}
          <form action={switchToTransferAction.bind(null, order.ref, t!)}><SubmitButton className="btn-ghost w-full" pendingText="Switching…">Pay by bank transfer instead</SubmitButton></form>
        </section>
      )}

      {step > 0 && (
        <section className="card mt-6 p-5 text-sm">
          <p>Paid {order.paidAt ? formatDate(order.paidAt) : ""}. Expected delivery: <b>{order.eta}</b> ({order.zoneLabel}).</p>
          {order.courier && <p className="mt-1">Courier: {order.courier}{order.tracking ? ` · Tracking ${order.tracking}` : ""}</p>}
          <Link href={`/order/${order.ref}/note?t=${t}`} className="btn-ghost mt-4 w-full">View / print delivery note</Link>
        </section>
      )}

      <section className="card mt-6 p-5">
        <h2 className="text-2xl">Summary</h2>
        <div className="mt-3 divide-y divide-line text-sm">
          {items.map((i) => <div key={i.id} className="flex justify-between py-2"><span>{i.name} × {i.qty}</span><span>{naira(i.unitPrice * i.qty)}</span></div>)}
          <div className="flex justify-between py-2"><span>Delivery ({order.zoneLabel})</span><span>{order.deliveryFee ? naira(order.deliveryFee) : "Free"}</span></div>
          <div className="flex justify-between py-2 text-base font-bold text-green-deep"><span>Total</span><span>{naira(order.total)}</span></div>
        </div>
        <p className="mt-3 text-sm text-muted">Deliver to {order.customerName}, {order.address}{order.area ? `, ${order.area}` : ""}, {order.state}</p>
      </section>

      <p className="mt-6 text-center text-sm text-muted">Questions? <a className="underline" href={help}>Chat with us on WhatsApp</a>. Keep this page&apos;s link to check your order.</p>
    </div>
  );
}
