import "server-only";
import type { PaymentProvider, PaymentResult } from "./types";

/*
 * Bachs adapter. NOT IMPLEMENTED YET: Bachs does not publish its API reference or webhook
 * signature algorithm. What we know (from its public WooCommerce plugin listing):
 *   API:        https://api.bachs.io  (sandbox: https://sandbox-api.bachs.io)
 *   Checkout:   hosted redirect (checkout.bachs.io) or popup via https://checkout.bachs.io/bachs.js
 *   Webhook:    header X-Bachs-Signature-V2 (algorithm unknown)
 *   Events:     collection.succeeded | collection.failed | collection.underpaid |
 *               checkout.expired | refund.paid | refund.failed
 *   Idempotency key supported on checkout sessions. Only ONE refund per charge.
 *
 * To finish: get the developer docs + sandbox keys from Bachs, then fill in the three
 * methods below. EVENT_MAP already matches their event names to our outcomes.
 */
export const EVENT_MAP: Record<string, PaymentResult["outcome"]> = {
  "collection.succeeded": "succeeded",
  "collection.failed": "failed",
  "collection.underpaid": "underpaid",
  "checkout.expired": "expired",
  "refund.paid": "refunded",
  "refund.failed": "other",
};

const notReady = () => {
  throw new Error("Bachs adapter is not implemented yet. Set PAYMENT_PROVIDER=paystack, or finish src/lib/payments/bachs.ts");
};

export const bachs: PaymentProvider = {
  name: "bachs",
  async initialize() {
    // POST {api}/checkout-sessions with amount (NGN), reference = order.ref,
    // idempotency key = order.ref, customer name/email/phone, redirect URL.
    return notReady();
  },
  async parseWebhook() {
    // Verify X-Bachs-Signature-V2 against BACHS_WEBHOOK_SECRET, then map with EVENT_MAP.
    return notReady();
  },
  async verify() {
    return notReady();
  },
};
