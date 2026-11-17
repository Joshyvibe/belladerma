import type { Order } from "@/db/schema";

export type PaymentOutcome = "succeeded" | "failed" | "underpaid" | "expired" | "refunded" | "other";

export type PaymentResult = {
  provider: string;
  eventId: string;     // unique per provider event, used to drop duplicate webhooks
  type: string;        // provider's own event name, kept for the audit log
  ref: string;         // our order ref
  outcome: PaymentOutcome;
  amount: number;      // naira
  currency: string;
  providerRef: string; // provider's charge/collection id
  payload: unknown;
};

export interface PaymentProvider {
  name: string;
  /** Creates a hosted checkout and returns where to send the buyer. */
  initialize(order: Order): Promise<{ redirectUrl: string }>;
  /** Checks the webhook signature and normalises it. Returns null when the signature is invalid. */
  parseWebhook(rawBody: string, headers: Headers): Promise<PaymentResult | null>;
  /** Server-to-server lookup of one payment attempt, used when the buyer returns from checkout. */
  verify(providerReference: string): Promise<PaymentResult | null>;
}
