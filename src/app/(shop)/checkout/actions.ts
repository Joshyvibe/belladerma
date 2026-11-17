"use server";

import { ZodError } from "zod";
import { OrderError, placeOrder, type CheckoutInput } from "@/lib/orders";
import { paymentProvider } from "@/lib/payments";
import { getDb, schema } from "@/db";
import { orderToken } from "@/lib/tokens";
import { eq } from "drizzle-orm";

export type PlaceOrderResult = { ok: true; redirect: string } | { ok: false; error: string; fields?: Record<string, string> };

export async function placeOrderAction(input: CheckoutInput): Promise<PlaceOrderResult> {
  try {
    const order = await placeOrder(input);
    const orderPage = `/order/${order.ref}?t=${orderToken(order.ref)}`;
    if (order.paymentMethod === "transfer") return { ok: true, redirect: orderPage };

    const provider = paymentProvider();
    try {
      const { redirectUrl } = await provider.initialize(order);
      const db = await getDb();
      await db.update(schema.orders).set({ provider: provider.name }).where(eq(schema.orders.id, order.id));
      return { ok: true, redirect: redirectUrl };
    } catch (e) {
      console.error("payment init failed", e);
      // The order exists. Send them to it so they can retry or switch to transfer.
      return { ok: true, redirect: `${orderPage}&payerror=1` };
    }
  } catch (e) {
    if (e instanceof ZodError) {
      const fields: Record<string, string> = {};
      for (const i of e.issues) fields[String(i.path[0])] ??= i.message;
      return { ok: false, error: "Please check the highlighted fields.", fields };
    }
    if (e instanceof OrderError) return { ok: false, error: e.message };
    console.error(e);
    return { ok: false, error: "Something went wrong. Please try again or order on WhatsApp." };
  }
}
