import "server-only";
import crypto from "node:crypto";
import type { PaymentProvider, PaymentResult } from "./types";
import { appUrl } from "@/lib/app-url";

// Docs: https://paystack.com/docs/payments/accept-payments/ and /payments/webhooks/
const API = "https://api.paystack.co";
const key = () => {
  const k = process.env.PAYSTACK_SECRET_KEY;
  if (!k) throw new Error("PAYSTACK_SECRET_KEY is not set");
  return k;
};

type Tx = { id: number; reference: string; status: string; amount: number; currency: string };

function toResult(type: string, tx: Tx, payload: unknown): PaymentResult {
  const outcome = tx.status === "success" ? "succeeded" : tx.status === "failed" || tx.status === "abandoned" ? "failed" : "other";
  return {
    // Each attempt uses "<order ref>_<suffix>" because Paystack won't reuse a reference on retry.
    provider: "paystack", eventId: `${type}:${tx.id}:${tx.status}`, type, ref: tx.reference.split("_")[0], outcome,
    amount: tx.amount / 100, currency: tx.currency, providerRef: String(tx.id), payload,
  };
}

export const paystack: PaymentProvider = {
  name: "paystack",

  async initialize(order) {
    const res = await fetch(`${API}/transaction/initialize`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key()}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        // Paystack requires an email. Buyers can skip email, so we fall back to a per-order placeholder.
        email: order.email || `orders+${order.ref.toLowerCase()}@belladerma.com.ng`,
        amount: order.total * 100,
        currency: "NGN",
        reference: `${order.ref}_${Date.now().toString(36)}`,
        callback_url: `${appUrl()}/api/payments/callback?ref=${order.ref}`,
        metadata: { order_ref: order.ref, phone: order.phone, name: order.customerName },
      }),
    });
    const body = await res.json();
    if (!res.ok || !body.status) throw new Error(`Paystack initialize failed: ${body.message ?? res.status}`);
    return { redirectUrl: body.data.authorization_url as string };
  },

  async parseWebhook(rawBody, headers) {
    const sig = headers.get("x-paystack-signature") ?? "";
    const expected = crypto.createHmac("sha512", key()).update(rawBody).digest("hex");
    if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const evt = JSON.parse(rawBody) as { event: string; data: Tx };
    if (!evt.data?.reference) return null;
    return toResult(evt.event, evt.data, evt);
  },

  async verify(reference) {
    const res = await fetch(`${API}/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${key()}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = await res.json();
    return toResult("verify", body.data as Tx, body);
  },
};
