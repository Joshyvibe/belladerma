// End-to-end checks of the order engine against a real database. Never touches your data:
//   npm run test:smoke                              → fresh throwaway PGlite database
//   SMOKE_DATABASE_URL=postgres://… npm run test:smoke → an EMPTY Postgres you created for testing
// Notifications are forced into console mode, so no real email/WhatsApp is sent.
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

for (const k of ["RESEND_API_KEY", "WHATSAPP_TOKEN", "WHATSAPP_PHONE_NUMBER_ID", "SUPABASE_URL", "DATABASE_URL"]) delete process.env[k];
process.env.AUTH_SECRET ||= crypto.randomBytes(32).toString("hex");
process.env.APP_URL ||= "http://localhost:3000";
process.env.PAYMENT_PROVIDER = "paystack"; // online checkout enabled (no real calls are made)
process.env.PAYSTACK_SECRET_KEY = "sk_test_smoke";
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bd-smoke-"));
if (process.env.SMOKE_DATABASE_URL) process.env.DATABASE_URL = process.env.SMOKE_DATABASE_URL;
else process.env.PGLITE_DIR = path.join(tmp, "pglite");

let passed = 0;
const failures: string[] = [];
async function check(name: string, fn: () => unknown) {
  try { await fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { failures.push(name); console.log(`  ✗ ${name}\n      ${e instanceof Error ? e.message : e}`); }
}
function eq<T>(actual: T, expected: T, what = "value") {
  if (actual !== expected) throw new Error(`${what}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

async function main() {
  // Silence the console-mode notification output so the report stays readable.
  const log = console.log;
  console.log = (...a: unknown[]) => { if (typeof a[0] === "string" && /^\s*\[(email|whatsapp):dev\]/.test(a[0])) return; log(...a); };

  const { getDb, schema } = await import("../src/db");
  const { eq: whereEq } = await import("drizzle-orm");
  if (process.env.DATABASE_URL) {
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    const { seed } = await import("../src/db/seed");
    const db = await getDb();
    await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
    await seed(db, { adminEmail: "smoke@test.local", adminPassword: "smoke-password-123" });
  }
  const db = await getDb();
  const orders = await import("../src/lib/orders");
  const { quote } = await import("../src/lib/pricing");
  const tokens = await import("../src/lib/tokens");
  const { paystack } = await import("../src/lib/payments/paystack");
  const { getSettings } = await import("../src/lib/settings");

  const products = await db.select().from(schema.products);
  const zones = await db.select().from(schema.deliveryZones);
  const settings = await getSettings();
  const bySlug = (s: string) => products.find((p) => p.slug === s)!;
  const spf = bySlug("skin-protect-spf-50");
  const cleanser = bySlug("purifying-foaming-cleanser");
  const stockOf = async (id: number) => (await db.select().from(schema.products).where(whereEq(schema.products.id, id)))[0].stock;
  const buyer = { name: "Smoke Test", phone: "0803 123 4567", email: "smoke@example.com", address: "1 Test Street, Lagos" };

  console.log(`\nDatabase: ${process.env.DATABASE_URL ? "Postgres" : "PGlite (throwaway)"}`);
  console.log("\nCatalogue & pricing");
  await check("catalogue has the full range with photos", () => {
    eq(products.length >= 11, true, "product count ≥ 11");
    eq(products.filter((p) => p.images.length).length >= 10, true, "products with photos ≥ 10");
  });
  await check("Lekki resolves to Lekki/Ajah zone (₦3,500)", () => {
    const q = quote([{ productId: spf.id, qty: 1 }], products, zones, { state: "Lagos", area: "Lekki Phase 1" }, settings.freeDeliveryAbove);
    eq(q.zone?.code, "L3", "zone"); eq(q.deliveryFee, 3500, "fee"); eq(q.subtotal, spf.salePrice, "subtotal uses sale price");
  });
  await check("unlisted state falls back to Other states, Kano to Far north", () => {
    eq(quote([], products, zones, { state: "Rivers" }, 0).zone?.code, "NG", "Rivers");
    eq(quote([], products, zones, { state: "Kano" }, 0).zone?.code, "FAR", "Kano");
  });
  await check("free delivery kicks in above the threshold", () => {
    const qty = Math.ceil(settings.freeDeliveryAbove / spf.salePrice!);
    const q = quote([{ productId: spf.id, qty }], products, zones, { state: "Oyo" }, settings.freeDeliveryAbove);
    eq(q.freeDelivery, true, "freeDelivery"); eq(q.deliveryFee, 0, "fee");
  });

  console.log("\nBank transfer flow");
  const spfStock = await stockOf(spf.id);
  let transferId = 0;
  await check("place transfer order → AWAITING_TRANSFER with server-side total", async () => {
    const o = await orders.placeOrder({ ...buyer, items: [{ productId: spf.id, qty: 2 }], state: "Lagos", area: "Ikeja", paymentMethod: "transfer" });
    transferId = o.id;
    eq(o.status, "AWAITING_TRANSFER", "status"); eq(o.total, spf.salePrice! * 2 + 2500, "total"); eq(o.phone, "2348031234567", "normalised phone");
    eq(/^BD-\d{4}-[A-Z2-9]{4}$/.test(o.ref), true, "ref format");
  });
  await check("buyer taps “I've paid” → AWAITING_CONFIRMATION", async () => {
    const o = await orders.claimTransfer((await orders.getOrder({ id: transferId }))!, null);
    eq(o?.status, "AWAITING_CONFIRMATION", "status");
  });
  await check("admin confirms → PAID and stock goes down", async () => {
    const o = await orders.markPaid(transferId, "admin:smoke", { confirmedBy: "smoke" });
    eq(o?.status, "PAID", "status"); eq(await stockOf(spf.id), spfStock - 2, "stock");
  });
  await check("confirming twice does nothing (no double stock deduction)", async () => {
    eq(await orders.markPaid(transferId, "admin:smoke"), null, "second confirm");
    eq(await stockOf(spf.id), spfStock - 2, "stock");
  });
  await check("dispatch → DISPATCHED with courier, then DELIVERED", async () => {
    eq((await orders.dispatch(transferId, "admin:smoke", "Kwik", "KW123"))?.status, "DISPATCHED", "dispatch");
    eq((await orders.transition(transferId, "DELIVERED", "admin:smoke"))?.status, "DELIVERED", "deliver");
  });
  await check("illegal jump is refused (DELIVERED → AWAITING_TRANSFER)", async () => {
    eq(await orders.transition(transferId, "AWAITING_TRANSFER", "admin:smoke"), null, "transition");
  });
  await check("every step is in the audit log", async () => {
    const ev = await db.select().from(schema.orderEvents).where(whereEq(schema.orderEvents.orderId, transferId));
    const statuses = ev.filter((e) => e.type === "status").map((e) => e.toStatus);
    for (const s of ["AWAITING_TRANSFER", "AWAITING_CONFIRMATION", "PAID", "DISPATCHED", "DELIVERED"]) eq(statuses.includes(s as never), true, `log has ${s}`);
    eq(ev.some((e) => e.type === "notification"), true, "notifications logged");
  });
  await check("admin can reject a transfer → REJECTED, buyer can claim again", async () => {
    const o = await orders.placeOrder({ ...buyer, items: [{ productId: cleanser.id, qty: 1 }], state: "Ogun", paymentMethod: "transfer" });
    await orders.claimTransfer(o, null);
    eq((await orders.rejectTransfer(o.id, "admin:smoke", "payment not received"))?.status, "REJECTED", "reject");
    eq((await orders.claimTransfer((await orders.getOrder({ id: o.id }))!, null))?.status, "AWAITING_CONFIRMATION", "re-claim");
  });

  console.log("\nOnline payment flow");
  const pay = (ref: string, amount: number, eventId: string = crypto.randomUUID()) =>
    orders.applyPaymentResult({ provider: "mock", eventId, type: "test", ref, outcome: "succeeded", amount, currency: "NGN", providerRef: "P1", payload: {} });
  await check("successful payment → PAID; duplicate webhook ignored", async () => {
    const o = await orders.placeOrder({ ...buyer, items: [{ productId: cleanser.id, qty: 1 }], state: "Rivers", paymentMethod: "online" });
    eq(o.status, "PENDING_PAYMENT", "initial");
    eq(await pay(o.ref, o.total, "evt-1"), "paid", "first event");
    eq(await pay(o.ref, o.total, "evt-1"), "duplicate", "same event again");
    eq((await orders.getOrder({ id: o.id }))?.status, "PAID", "status");
  });
  await check("underpayment is held for review, not marked paid", async () => {
    const o = await orders.placeOrder({ ...buyer, items: [{ productId: cleanser.id, qty: 1 }], state: "Rivers", paymentMethod: "online" });
    eq(await pay(o.ref, o.total - 1000), "amount-mismatch", "outcome");
    eq((await orders.getOrder({ id: o.id }))?.status, "ON_HOLD", "status");
  });
  await check("failed payment → FAILED, buyer can switch to transfer", async () => {
    const o = await orders.placeOrder({ ...buyer, items: [{ productId: cleanser.id, qty: 1 }], state: "Rivers", paymentMethod: "online" });
    await orders.applyPaymentResult({ provider: "mock", eventId: crypto.randomUUID(), type: "test", ref: o.ref, outcome: "failed", amount: 0, currency: "NGN", providerRef: "P2", payload: {} });
    eq((await orders.getOrder({ id: o.id }))?.status, "FAILED", "failed");
    eq((await orders.transition(o.id, "AWAITING_TRANSFER", "customer", { patch: { paymentMethod: "transfer" } }))?.status, "AWAITING_TRANSFER", "switch");
  });

  console.log("\nValidation & security");
  await check("rejects more than the stock available", async () => {
    let err = "";
    try { await orders.placeOrder({ ...buyer, items: [{ productId: spf.id, qty: 20 }], state: "Lagos", area: "Ikeja", paymentMethod: "transfer" }); } catch (e) { err = String(e); }
    eq(/left|sold out/.test(err) || (await stockOf(spf.id)) >= 20, true, "stock error");
  });
  await check("rejects invalid phone numbers", async () => {
    let threw = false;
    try { await orders.placeOrder({ ...buyer, phone: "12345", items: [{ productId: spf.id, qty: 1 }], state: "Lagos", area: "Ikeja", paymentMethod: "transfer" }); } catch { threw = true; }
    eq(threw, true, "threw");
  });
  await check("rejects checkout without a valid email", async () => {
    let threw = false;
    try { await orders.placeOrder({ ...buyer, email: "", items: [{ productId: spf.id, qty: 1 }], state: "Lagos", area: "Ikeja", paymentMethod: "transfer" }); } catch { threw = true; }
    eq(threw, true, "threw");
  });
  await check("rejects delivery without an address (non-pickup)", async () => {
    let threw = false;
    try { await orders.placeOrder({ ...buyer, address: "", items: [{ productId: spf.id, qty: 1 }], state: "Kano", paymentMethod: "transfer" }); } catch { threw = true; }
    eq(threw, true, "threw");
  });
  await check("order links need the right token", () => {
    eq(tokens.checkOrderToken("BD-0000-AAAA", tokens.orderToken("BD-0000-AAAA")), true, "valid");
    eq(tokens.checkOrderToken("BD-0000-AAAA", tokens.orderToken("BD-0000-BBBB")), false, "other order's token");
    eq(tokens.checkOrderToken("BD-0000-AAAA", "x"), false, "garbage");
  });
  await check("one-tap admin links are signed; forged ones fail", async () => {
    const t = await tokens.signAdminAction({ orderId: 1, action: "confirm", adminId: 1 });
    eq((await tokens.readAdminAction(t))?.orderId, 1, "valid token");
    eq(await tokens.readAdminAction(t.slice(0, -4) + "AAAA"), null, "tampered token");
  });
  await check("Paystack webhook signature is verified", async () => {
    const body = JSON.stringify({ event: "charge.success", data: { id: 9, reference: "BD-0000-AAAA_x1", status: "success", amount: 1000000, currency: "NGN" } });
    const sig = crypto.createHmac("sha512", "sk_test_smoke").update(body).digest("hex");
    const ok = await paystack.parseWebhook(body, new Headers({ "x-paystack-signature": sig }));
    eq(ok?.ref, "BD-0000-AAAA", "ref (suffix stripped)"); eq(ok?.amount, 10000, "amount in naira");
    eq(await paystack.parseWebhook(body, new Headers({ "x-paystack-signature": "0".repeat(128) })), null, "bad signature");
  });

  console.log = log;
  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length) process.exitCode = 1;
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
    setTimeout(() => process.exit(), 100); // close the DB pool
  });
