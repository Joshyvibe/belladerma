import { NextResponse } from "next/server";
import { applyPaymentResult, getOrder } from "@/lib/orders";
import { paymentProvider } from "@/lib/payments";
import { orderToken } from "@/lib/tokens";

// The buyer's browser lands here after the hosted checkout. We verify server-to-server
// rather than trusting the redirect; the webhook may also arrive first, which is fine.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const ref = url.searchParams.get("ref") ?? "";
  const attempt = url.searchParams.get("reference") ?? url.searchParams.get("trxref");
  const order = await getOrder({ ref });
  if (!order) return NextResponse.redirect(new URL("/", req.url));
  if (attempt) {
    try {
      const result = await paymentProvider(order.provider ?? undefined).verify(attempt);
      if (result && result.ref === order.ref) await applyPaymentResult(result);
    } catch (e) {
      console.error("payment verify failed", e);
    }
  }
  return NextResponse.redirect(new URL(`/order/${ref}?t=${orderToken(ref)}`, req.url));
}
