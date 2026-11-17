import crypto from "node:crypto";
import { notFound, redirect } from "next/navigation";
import { naira } from "@/lib/format";
import { applyPaymentResult, getOrder } from "@/lib/orders";
import { checkOrderToken, orderToken } from "@/lib/tokens";
import { mockPaymentsAllowed } from "@/lib/payments";
import { SubmitButton } from "@/components/Loading";

export const metadata = { title: "Demo checkout", robots: { index: false } };

// Stand-in for the Paystack/Bachs hosted page so the full flow can be demoed without keys.
async function mockPay(ref: string, token: string, outcome: "succeeded" | "failed") {
  "use server";
  if (!mockPaymentsAllowed() || !checkOrderToken(ref, token)) throw new Error("Not allowed");
  const order = await getOrder({ ref });
  if (!order) throw new Error("Order not found");
  await applyPaymentResult({
    provider: "mock", eventId: crypto.randomUUID(), type: `mock.${outcome}`, ref, outcome,
    amount: order.total, currency: "NGN", providerRef: `MOCK-${crypto.randomBytes(4).toString("hex").toUpperCase()}`, payload: {},
  });
  redirect(`/order/${ref}?t=${orderToken(ref)}`);
}

export default async function MockPay({ searchParams }: { searchParams: Promise<{ ref?: string; t?: string }> }) {
  const { ref = "", t = "" } = await searchParams;
  if (!mockPaymentsAllowed() || !checkOrderToken(ref, t)) notFound();
  const order = await getOrder({ ref });
  if (!order) notFound();
  return (
    <div className="wrap max-w-md py-12">
      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        <div className="flex justify-between bg-gray-900 px-4 py-3 text-sm text-white"><span>Payment gateway <span className="opacity-60">(demo)</span></span><span>{ref}</span></div>
        <div className="p-5">
          <div className="text-sm text-muted">Paying Belladerma Skincare</div>
          <div className="mt-1 text-3xl font-bold">{naira(order.total)}</div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
            {["Card", "Transfer", "USSD"].map((m, i) => <div key={m} className={`rounded-lg border p-2 ${i === 0 ? "border-gray-900 font-semibold" : "border-line"}`}>{m}</div>)}
          </div>
          <form action={mockPay.bind(null, ref, t, "succeeded")}><SubmitButton className="btn mt-5 w-full bg-gray-900 text-white" pendingText="Processing payment…">Pay {naira(order.total)}</SubmitButton></form>
          <form action={mockPay.bind(null, ref, t, "failed")}><SubmitButton className="btn mt-2 w-full border border-line" pendingText="Processing…">Simulate a failed payment</SubmitButton></form>
          <p className="mt-4 text-xs text-muted">In production this is the Paystack (or Bachs) hosted checkout. The order is marked paid only from the gateway&apos;s signed webhook or a server-side verification.</p>
        </div>
      </div>
    </div>
  );
}
