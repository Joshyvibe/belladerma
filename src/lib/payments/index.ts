import "server-only";
import { orderToken } from "@/lib/tokens";
import { bachs } from "./bachs";
import { paystack } from "./paystack";
import type { PaymentProvider } from "./types";

/**
 * Online payment is offered at checkout only once a real gateway is configured. Until then the
 * shop is in demo mode: bank transfer is the payment option and pages show walkthrough hints.
 */
export const onlinePaymentsEnabled = () => ["paystack", "bachs"].includes(process.env.PAYMENT_PROVIDER ?? "");
export const isDemoMode = () => !onlinePaymentsEnabled();

/** Mock payments run locally, and online only when ALLOW_MOCK_PAYMENTS=1 (for a hosted demo). */
export const mockPaymentsAllowed = () =>
  (process.env.PAYMENT_PROVIDER || "mock") === "mock" &&
  (process.env.NODE_ENV !== "production" || process.env.ALLOW_MOCK_PAYMENTS === "1");

/** Demo provider: a fake checkout page at /pay/mock. */
const mock: PaymentProvider = {
  name: "mock",
  async initialize(order) {
    if (!mockPaymentsAllowed()) throw new Error("Mock payments are disabled (set ALLOW_MOCK_PAYMENTS=1 for a demo)");
    return { redirectUrl: `/pay/mock?ref=${order.ref}&t=${orderToken(order.ref)}` };
  },
  async parseWebhook() { return null; },
  async verify() { return null; },
};

const PROVIDERS: Record<string, PaymentProvider> = { paystack, bachs, mock };

export function paymentProvider(name = process.env.PAYMENT_PROVIDER || "mock") {
  const p = PROVIDERS[name];
  if (!p) throw new Error(`Unknown PAYMENT_PROVIDER "${name}"`);
  return p;
}
export const providerByName = (name: string) => PROVIDERS[name] ?? null;
