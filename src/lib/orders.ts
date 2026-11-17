import "server-only";
import crypto from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import type { Order, OrderStatus } from "@/db/schema";
import { NIGERIAN_STATES, normalizePhone } from "@/lib/format";
import { quote } from "@/lib/pricing";
import { getSettings } from "@/lib/settings";
import * as notify from "@/lib/notify";
import type { PaymentResult } from "@/lib/payments/types";
import { onlinePaymentsEnabled } from "@/lib/payments";

// Which status changes are allowed. Anything else is refused, which also makes repeats harmless.
const NEXT: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ["PAID", "FAILED", "ON_HOLD", "CANCELLED", "AWAITING_TRANSFER"],
  FAILED: ["PENDING_PAYMENT", "PAID", "CANCELLED", "AWAITING_TRANSFER"],
  AWAITING_TRANSFER: ["AWAITING_CONFIRMATION", "PAID", "CANCELLED"],
  AWAITING_CONFIRMATION: ["PAID", "REJECTED", "CANCELLED"],
  REJECTED: ["AWAITING_CONFIRMATION", "PAID", "CANCELLED"],
  ON_HOLD: ["PAID", "CANCELLED", "REFUNDED"],
  PAID: ["PROCESSING", "DISPATCHED", "REFUNDED"],
  PROCESSING: ["DISPATCHED", "REFUNDED"],
  DISPATCHED: ["DELIVERED"],
  DELIVERED: ["REFUNDED"],
  CANCELLED: ["ON_HOLD"], // a late payment on a cancelled order goes to admin review
  REFUNDED: [],
};
export const allowedNext = (s: OrderStatus) => NEXT[s];

export class OrderError extends Error {}

// ---------------------------------------------------------------- placing orders

export const checkoutSchema = z.object({
  items: z.array(z.object({ productId: z.number().int(), qty: z.number().int().min(1).max(20) })).min(1).max(30),
  name: z.string().trim().min(2, "Enter your full name").max(80),
  phone: z.string().trim().transform((v, ctx) => {
    const n = normalizePhone(v);
    if (!n) ctx.addIssue({ code: "custom", message: "Enter a valid Nigerian phone number" });
    return n ?? "";
  }),
  email: z.string().trim().max(120).regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email address"),
  state: z.enum(NIGERIAN_STATES),
  area: z.string().trim().max(60).optional().nullable(),
  address: z.string().trim().max(300).default(""),
  paymentMethod: z.enum(["online", "transfer"]),
});
export type CheckoutInput = z.input<typeof checkoutSchema>;

function newRef() {
  const d = new Date();
  const ym = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}`;
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid misreading on bank narrations
  const rand = Array.from(crypto.randomBytes(4), (b) => alphabet[b % alphabet.length]).join("");
  return `BD-${ym}-${rand}`;
}

export async function placeOrder(raw: unknown) {
  const input = checkoutSchema.parse(raw);
  if (input.paymentMethod === "online" && !onlinePaymentsEnabled()) {
    throw new OrderError("Online payment isn't available yet. Please choose bank transfer.");
  }
  const db = await getDb();
  const [products, zones, settings] = await Promise.all([
    db.select().from(schema.products).where(inArray(schema.products.id, input.items.map((i) => i.productId))),
    db.select().from(schema.deliveryZones),
    getSettings(),
  ]);
  const q = quote(input.items, products, zones, { state: input.state, area: input.area }, settings.freeDeliveryAbove);
  if (q.problems.length) throw new OrderError(q.problems.join(" "));
  if (!q.zone) throw new OrderError("Choose a delivery location.");
  const pickup = q.zone.code === "PICKUP";
  if (!pickup && input.address.length < 6) throw new OrderError("Enter your delivery address.");

  const status: OrderStatus = input.paymentMethod === "online" ? "PENDING_PAYMENT" : "AWAITING_TRANSFER";
  const order = await db.transaction(async (tx) => {
    const [o] = await tx.insert(schema.orders).values({
      ref: newRef(), status,
      customerName: input.name, phone: input.phone, email: input.email,
      address: pickup ? settings.store.pickupAddress : input.address,
      state: input.state, area: input.area || null,
      zoneCode: q.zone!.code, zoneLabel: q.zone!.label, eta: q.zone!.eta,
      subtotal: q.subtotal, discount: q.discount, deliveryFee: q.deliveryFee ?? 0, total: q.total,
      paymentMethod: input.paymentMethod,
    }).returning();
    await tx.insert(schema.orderItems).values(q.lines.map((l) => ({
      orderId: o.id, productId: l.product.id, name: l.product.name, size: l.product.size,
      listPrice: l.list, unitPrice: l.unit, qty: l.qty,
    })));
    await tx.insert(schema.orderEvents).values({ orderId: o.id, actor: "customer", type: "status", toStatus: status, note: "Order placed" });
    return o;
  });
  if (order.paymentMethod === "transfer") await notify.onTransferCreated(order);
  return order;
}

// ---------------------------------------------------------------- status changes

export async function getOrder(by: { id: number } | { ref: string }) {
  const db = await getDb();
  const [o] = await db.select().from(schema.orders)
    .where("id" in by ? eq(schema.orders.id, by.id) : eq(schema.orders.ref, by.ref));
  return o ?? null;
}

/**
 * Moves an order to a new status if (a) the move is allowed and (b) nobody else moved it first.
 * Returns the updated order, or null if nothing changed (already done / not allowed).
 */
export async function transition(
  orderId: number, to: OrderStatus, actor: string,
  opts: { note?: string; patch?: Partial<typeof schema.orders.$inferInsert>; data?: unknown } = {},
): Promise<Order | null> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [cur] = await tx.select().from(schema.orders).where(eq(schema.orders.id, orderId));
    if (!cur || !NEXT[cur.status].includes(to)) return null;
    const [updated] = await tx.update(schema.orders)
      .set({ ...opts.patch, status: to, updatedAt: new Date() })
      .where(and(eq(schema.orders.id, orderId), eq(schema.orders.status, cur.status)))
      .returning();
    if (!updated) return null;
    await tx.insert(schema.orderEvents).values({
      orderId, actor, type: "status", fromStatus: cur.status, toStatus: to, note: opts.note ?? null, data: opts.data ?? null,
    });
    if (to === "PAID") {
      // Stock moves only when money is in.
      const items = await tx.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, orderId));
      for (const it of items) {
        if (!it.productId) continue;
        await tx.update(schema.products)
          .set({ stock: sql`greatest(${schema.products.stock} - ${it.qty}, 0)` })
          .where(eq(schema.products.id, it.productId));
      }
    }
    return updated;
  });
}

export async function markPaid(orderId: number, actor: string, patch: Partial<typeof schema.orders.$inferInsert> = {}, note?: string) {
  const o = await transition(orderId, "PAID", actor, { patch: { paidAt: new Date(), ...patch }, note });
  if (o) {
    await notify.onPaid(o);
    await checkLowStock(orderId);
  }
  return o;
}

async function checkLowStock(orderId: number) {
  const db = await getDb();
  const low = await db.select({ name: schema.products.name, stock: schema.products.stock })
    .from(schema.orderItems)
    .innerJoin(schema.products, eq(schema.products.id, schema.orderItems.productId))
    .where(and(eq(schema.orderItems.orderId, orderId), sql`${schema.products.stock} <= ${schema.products.lowStockAt}`));
  for (const p of low) await notify.onLowStock(p);
}

/** Buyer taps "I've made the transfer". */
export async function claimTransfer(order: Order, receiptPath: string | null) {
  const o = await transition(order.id, "AWAITING_CONFIRMATION", "customer", {
    note: receiptPath ? "Buyer says they've paid (receipt attached)" : "Buyer says they've paid",
    patch: { transferClaimedAt: new Date(), receiptPath: receiptPath ?? order.receiptPath, remindedAt: null },
  });
  if (o) await notify.onTransferClaimed(o);
  return o;
}

export async function rejectTransfer(orderId: number, actor: string, reason: string) {
  const o = await transition(orderId, "REJECTED", actor, { note: reason });
  if (o) await notify.onRejected(o, reason);
  return o;
}

export async function dispatch(orderId: number, actor: string, courier: string, tracking: string) {
  const o = await transition(orderId, "DISPATCHED", actor, {
    patch: { courier: courier || null, tracking: tracking || null },
    note: [courier, tracking].filter(Boolean).join(" · ") || undefined,
  });
  if (o) await notify.onDispatched(o);
  return o;
}

// ---------------------------------------------------------------- provider results

/** Webhooks and return-from-checkout verification both land here. Safe to call repeatedly. */
export async function applyPaymentResult(r: PaymentResult) {
  const db = await getDb();
  const inserted = await db.insert(schema.paymentEvents)
    .values({ provider: r.provider, eventId: r.eventId, orderRef: r.ref, type: r.type, payload: r.payload as object })
    .onConflictDoNothing()
    .returning({ id: schema.paymentEvents.id });
  if (!inserted.length) return "duplicate";

  const order = await getOrder({ ref: r.ref });
  if (!order) return "unknown-order";
  const actor = `provider:${r.provider}`;
  const patch = { provider: r.provider, providerRef: r.providerRef };

  switch (r.outcome) {
    case "succeeded": {
      if (r.currency !== order.currency || r.amount < order.total) {
        await transition(order.id, "ON_HOLD", actor, { patch, note: `Paid ${r.currency} ${r.amount}, expected ${order.currency} ${order.total}` });
        return "amount-mismatch";
      }
      if (order.status === "CANCELLED") {
        await transition(order.id, "ON_HOLD", actor, { patch, note: "Payment arrived after the order was cancelled" });
        return "late";
      }
      await markPaid(order.id, actor, patch, `${r.provider} ${r.type}`);
      return "paid";
    }
    case "underpaid":
      await transition(order.id, "ON_HOLD", actor, { patch, note: `Underpaid: ${r.amount}` });
      return "on-hold";
    case "failed":
      await transition(order.id, "FAILED", actor, { patch, note: r.type });
      return "failed";
    default:
      await db.insert(schema.orderEvents).values({ orderId: order.id, actor, type: "payment", note: r.type });
      return "logged";
  }
}
