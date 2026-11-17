import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { Order } from "@/db/schema";
import { naira } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { orderUrl, signAdminAction } from "@/lib/tokens";
import { sendEmail, sendWhatsApp, type SendResult } from "./channels";
import { appUrl } from "@/lib/app-url";

const APP = appUrl;
const first = (name: string) => name.split(" ")[0];

// Notifications never throw. A failed send is logged on the order so admins can see it.
async function log(order: Order, event: string, results: SendResult[]) {
  const db = await getDb();
  for (const r of results) {
    await db.insert(schema.orderEvents).values({
      orderId: order.id, actor: "system", type: "notification",
      note: `${event} → ${r.channel} ${r.to}${r.skipped ? " (not configured)" : r.ok ? "" : " FAILED"}`,
      data: r.error ? { error: r.error.slice(0, 500) } : null,
    });
  }
}

async function notifyAdmins() {
  const db = await getDb();
  return db.select().from(schema.admins).where(and(eq(schema.admins.notify, true), eq(schema.admins.active, true)));
}

function emailShell(title: string, body: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#1b2420">
    <div style="background:#153628;color:#fff;padding:16px 20px;font-size:18px;letter-spacing:2px">BELLADERMA</div>
    <div style="padding:20px"><h2 style="color:#153628;margin-top:0">${title}</h2>${body}</div>
    <div style="padding:12px 20px;font-size:12px;color:#5d6b65">Belladerma Skincare · Targeted skincare for melanin-rich skin</div></div>`;
}
const button = (href: string, label: string) =>
  `<p><a href="${href}" style="display:inline-block;background:#1f4d3a;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">${label}</a></p>`;

export async function onPaid(order: Order) {
  const link = orderUrl(order.ref, "/note");
  const out: SendResult[] = [
    await sendWhatsApp(order.phone, "order_payment_received", [first(order.customerName), naira(order.total), order.ref, link]),
  ];
  if (order.email) out.push(await sendEmail(order.email, `Payment received: ${order.ref}`,
    emailShell("Payment confirmed 🎉", `<p>Hi ${first(order.customerName)}, we've received ${naira(order.total)} for order <b>${order.ref}</b>. Expected delivery: ${order.eta}.</p>${button(link, "View delivery note")}`)));
  for (const a of await notifyAdmins()) {
    const adminLink = `${APP()}/admin/orders/${order.id}`;
    if (a.phone) out.push(await sendWhatsApp(a.phone, "admin_new_paid_order", [order.ref, naira(order.total), order.zoneLabel, order.state, adminLink]));
    out.push(await sendEmail(a.email, `New paid order ${order.ref}: ${naira(order.total)}`,
      emailShell("New paid order, ready to pack", `<p><b>${order.ref}</b>: ${naira(order.total)} from ${order.customerName}, delivering to ${order.zoneLabel} (${order.area ?? order.state}).</p>${button(adminLink, "Open order")}`)));
  }
  await log(order, "paid", out);
}

export async function onTransferCreated(order: Order) {
  if (!order.email) return;
  const s = await getSettings();
  const r = await sendEmail(order.email, `Complete your transfer: ${order.ref}`,
    emailShell("Complete your transfer", `<p>Please transfer <b>${naira(order.total)}</b> to:</p>
      <p>${s.bank.bank}<br>${s.bank.accountName}<br><b>${s.bank.accountNumber}</b><br>Narration: <b>${order.ref}</b></p>
      ${button(orderUrl(order.ref), "I've made the transfer")}`));
  await log(order, "transfer details", [r]);
}

export async function onTransferClaimed(order: Order) {
  const s = await getSettings();
  const out: SendResult[] = [
    await sendWhatsApp(order.phone, "order_transfer_pending", [first(order.customerName), naira(order.total), order.ref]),
  ];
  if (order.email) out.push(await sendEmail(order.email, `We're confirming your payment: ${order.ref}`,
    emailShell("We're confirming your payment", `<p>Thanks ${first(order.customerName)}. We're checking for your transfer of ${naira(order.total)} and usually confirm within ${s.transferConfirmHours} hours.</p>${button(orderUrl(order.ref), "View order")}`)));
  out.push(...(await alertAdminsToConfirm(order, false)));
  await log(order, "transfer claimed", out);
}

/** Each admin gets their own signed one-tap link, so the audit log shows who confirmed. */
async function alertAdminsToConfirm(order: Order, reminder: boolean) {
  const out: SendResult[] = [];
  for (const a of await notifyAdmins()) {
    const token = await signAdminAction({ orderId: order.id, action: "confirm", adminId: a.id });
    const link = `${APP()}/admin/action?token=${encodeURIComponent(token)}`;
    if (a.phone) out.push(await sendWhatsApp(a.phone, "admin_confirm_transfer", [naira(order.total), order.customerName, order.ref, link]));
    out.push(await sendEmail(a.email, `${reminder ? "Reminder: " : ""}Confirm transfer ${naira(order.total)}: ${order.ref}`,
      emailShell(reminder ? "Still waiting for confirmation" : "Transfer to confirm",
        `<p><b>${order.customerName}</b> (${order.phone}) says they've sent <b>${naira(order.total)}</b> for <b>${order.ref}</b>.</p>
         <p>Check the bank app for narration <b>${order.ref}</b>, then:</p>${button(link, "Review & confirm")}
         <p style="font-size:12px;color:#5d6b65">The link works once and expires in 72 hours. You can also confirm from Admin → Orders.</p>`)));
  }
  return out;
}

export async function remindAdmins(order: Order) {
  await log(order, "confirm reminder", await alertAdminsToConfirm(order, true));
}

export async function onRejected(order: Order, reason: string) {
  const s = await getSettings();
  const out: SendResult[] = [
    await sendWhatsApp(order.phone, "order_rejected", [first(order.customerName), order.ref, reason]),
  ];
  if (order.email) out.push(await sendEmail(order.email, `We couldn't confirm your payment: ${order.ref}`,
    emailShell("Payment not confirmed", `<p>Hi ${first(order.customerName)}, we couldn't confirm payment for <b>${order.ref}</b>: ${reason}.</p>
      <p>If you've paid, reply with your receipt or chat with us on WhatsApp: wa.me/${s.store.whatsapp}</p>${button(orderUrl(order.ref), "View order")}`)));
  await log(order, "rejected", out);
}

export async function onDispatched(order: Order) {
  const out: SendResult[] = [
    await sendWhatsApp(order.phone, "order_dispatched", [first(order.customerName), order.ref, order.courier || "our rider", order.tracking || "—"]),
  ];
  if (order.email) out.push(await sendEmail(order.email, `Your order is on the way: ${order.ref}`,
    emailShell("Your order is on the way 🚚", `<p>Order <b>${order.ref}</b> has left with ${order.courier || "our rider"}.${order.tracking ? ` Tracking: <b>${order.tracking}</b>.` : ""} Expected: ${order.eta}.</p>${button(orderUrl(order.ref), "Track order")}`)));
  await log(order, "dispatched", out);
}

export async function onLowStock(product: { name: string; stock: number }) {
  for (const a of await notifyAdmins()) {
    await sendEmail(a.email, `Low stock: ${product.name} (${product.stock} left)`,
      emailShell("Low stock", `<p>${product.name} has <b>${product.stock}</b> left.</p>${button(`${APP()}/admin/products`, "Update stock")}`));
  }
}
