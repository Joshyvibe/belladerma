import Link from "next/link";
import { readAdminAction } from "@/lib/tokens";
import { getOrder } from "@/lib/orders";
import { naira, formatDate } from "@/lib/format";
import { fileUrl } from "@/lib/storage";
import { oneTapAction } from "../actions";
import { SubmitButton } from "@/components/Loading";

export const dynamic = "force-dynamic";
export const metadata = { title: "Confirm payment", robots: { index: false } };

const MESSAGES: Record<string, string> = {
  confirmed: "Payment confirmed. The customer has been notified and the order is ready to pack.",
  rejected: "Payment rejected. The customer has been told why.",
  unchanged: "Nothing changed. Someone may have already handled this order.",
  used: "This link has already been used.",
  expired: "This link has expired or is invalid. Open the order from the admin panel instead.",
};

// Opened from the WhatsApp/email alert. Viewing does nothing (so link previews and email
// scanners can't confirm anything); the admin must press a button, which POSTs.
export default async function OneTap({ searchParams }: { searchParams: Promise<{ token?: string; state?: string }> }) {
  const { token, state } = await searchParams;
  const t = token ? await readAdminAction(token) : null;
  const order = t ? await getOrder({ id: t.orderId }) : null;

  return (
    <div className="grid min-h-screen place-items-center bg-cream px-4 py-10">
      <div className="card w-full max-w-md p-6">
        <div className="serif mb-4 text-xl font-bold tracking-[.06em]">BELLADERMA ADMIN</div>
        {state || !order ? (
          <>
            <p>{MESSAGES[state ?? "expired"]}</p>
            <Link href="/admin/orders" className="btn-ghost mt-5 w-full">Open admin</Link>
          </>
        ) : (
          <>
            <h1 className="text-3xl">Confirm {naira(order.total)}?</h1>
            <p className="mt-2 text-sm">From <b>{order.customerName}</b> ({order.phone}) for order <b>{order.ref}</b>.</p>
            {order.transferClaimedAt && <p className="text-xs text-muted">Buyer said they paid {formatDate(order.transferClaimedAt)}</p>}
            {order.receiptPath && <p className="mt-2 text-sm">Receipt: <a className="underline" href={fileUrl(order.receiptPath)} target="_blank" rel="noopener">view</a> (needs admin login)</p>}
            <p className="mt-3 rounded-xl bg-gold-soft p-3 text-sm text-gold-ink">Check the bank app for <b>{naira(order.total)}</b> with narration <b>{order.ref}</b> before confirming.</p>
            {order.status === "AWAITING_CONFIRMATION" || order.status === "AWAITING_TRANSFER" || order.status === "REJECTED" ? (
              <div className="mt-5 space-y-3">
                <form action={oneTapAction.bind(null, token!)}>
                  <input type="hidden" name="decision" value="confirm" />
                  <SubmitButton className="btn-primary w-full" pendingText="Confirming…">✓ Yes, payment received</SubmitButton>
                </form>
                <form action={oneTapAction.bind(null, token!)} className="space-y-2">
                  <input type="hidden" name="decision" value="reject" />
                  <select name="reason" className="input py-2 text-sm">
                    <option>payment not received</option><option>amount is less than the order total</option><option>narration/ref doesn&apos;t match</option>
                  </select>
                  <SubmitButton className="btn-danger w-full" pendingText="Rejecting…">Not received, reject</SubmitButton>
                </form>
              </div>
            ) : (
              <p className="mt-4 text-sm">This order is already <b>{order.status.toLowerCase().replace(/_/g, " ")}</b>. Nothing to do.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
