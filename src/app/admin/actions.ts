"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { CONCERNS, ORDER_STATUSES, type OrderStatus } from "@/db/schema";
import {
  clearLoginFailures, endSession, loginThrottled, recordLoginFailure, requireAdmin, startSession,
} from "@/lib/auth";
import { normalizePhone } from "@/lib/format";
import { dispatch, markPaid, rejectTransfer, transition } from "@/lib/orders";
import { saveSetting, getSettings } from "@/lib/settings";
import { saveUpload, validateUpload } from "@/lib/storage";
import { readAdminAction } from "@/lib/tokens";
import { sendEmail, sendWhatsApp } from "@/lib/notify/channels";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const int = (f: FormData, k: string) => {
  const v = str(f, k).replace(/[,₦\s]/g, "");
  return v === "" ? null : Math.max(0, Math.round(Number(v)));
};
const who = (a: { email: string }) => `admin:${a.email}`;

// ---------------------------------------------------------------- auth

export async function loginAction(_prev: unknown, form: FormData) {
  const email = str(form, "email").toLowerCase();
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0] ?? "local";
  const key = `${ip}:${email}`;
  if (loginThrottled(key)) return { error: "Too many attempts. Try again in 15 minutes." };
  const db = await getDb();
  const [admin] = await db.select().from(schema.admins).where(eq(schema.admins.email, email));
  const ok = admin?.active && (await bcrypt.compare(str(form, "password"), admin.passwordHash));
  if (!ok) { recordLoginFailure(key); return { error: "Wrong email or password." }; }
  clearLoginFailures(key);
  await startSession(admin.id);
  redirect(str(form, "next").startsWith("/admin") ? str(form, "next") : "/admin");
}

export async function logoutAction() {
  await endSession();
  redirect("/admin/login");
}

// ---------------------------------------------------------------- orders

export async function confirmPaymentAction(orderId: number, form: FormData) {
  const admin = await requireAdmin();
  await markPaid(orderId, who(admin), { confirmedBy: admin.email }, str(form, "note") || "Transfer confirmed in bank app");
  revalidatePath(`/admin/orders/${orderId}`);
}

export async function rejectPaymentAction(orderId: number, form: FormData) {
  const admin = await requireAdmin();
  const reason = str(form, "reason") === "other" ? str(form, "other") || "payment not found" : str(form, "reason");
  await rejectTransfer(orderId, who(admin), reason || "payment not received");
  revalidatePath(`/admin/orders/${orderId}`);
}

export async function setStatusAction(orderId: number, form: FormData) {
  const admin = await requireAdmin();
  const to = str(form, "to") as OrderStatus;
  if (!ORDER_STATUSES.includes(to)) return;
  if (to === "DISPATCHED") await dispatch(orderId, who(admin), str(form, "courier"), str(form, "tracking"));
  else if (to === "PAID") await markPaid(orderId, who(admin), { confirmedBy: admin.email }, str(form, "note") || undefined);
  else await transition(orderId, to, who(admin), { note: str(form, "note") || undefined });
  revalidatePath(`/admin/orders/${orderId}`);
}

export async function addNoteAction(orderId: number, form: FormData) {
  const admin = await requireAdmin();
  const note = str(form, "note");
  if (!note) return;
  const db = await getDb();
  await db.insert(schema.orderEvents).values({ orderId, actor: who(admin), type: "note", note });
  revalidatePath(`/admin/orders/${orderId}`);
}

/** POST target of the one-tap link page. The signed token is the authorisation; it works once. */
export async function oneTapAction(token: string, form: FormData) {
  const t = await readAdminAction(token);
  if (!t) redirect("/admin/action?state=expired");
  const db = await getDb();
  const used = await db.insert(schema.usedActionTokens).values({ jti: t.jti }).onConflictDoNothing().returning();
  if (!used.length) redirect("/admin/action?state=used");
  const [admin] = await db.select().from(schema.admins).where(eq(schema.admins.id, t.adminId));
  if (!admin?.active) redirect("/admin/action?state=expired");
  const decision = str(form, "decision");
  const res = decision === "confirm"
    ? await markPaid(t.orderId, `${who(admin)} (one-tap link)`, { confirmedBy: admin.email }, "Confirmed from notification link")
    : await rejectTransfer(t.orderId, `${who(admin)} (one-tap link)`, str(form, "reason") || "payment not received");
  redirect(`/admin/action?state=${res ? (decision === "confirm" ? "confirmed" : "rejected") : "unchanged"}`);
}

// ---------------------------------------------------------------- products

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export async function saveProductAction(id: number | null, _prev: unknown, form: FormData) {
  await requireAdmin();
  const name = str(form, "name");
  const price = int(form, "price");
  const concern = str(form, "concern") as (typeof CONCERNS)[number];
  if (!name || price == null || price <= 0) return { error: "Name and price are required." };
  if (!CONCERNS.includes(concern)) return { error: "Pick a concern." };
  const salePrice = int(form, "salePrice");
  if (salePrice != null && salePrice >= price) return { error: "Sale price must be lower than the normal price." };

  const db = await getDb();
  const existing = id ? (await db.select().from(schema.products).where(eq(schema.products.id, id)))[0] : null;
  const keep = form.getAll("keepImage").map(String);
  const images = (existing?.images ?? []).filter((k) => keep.includes(k));
  for (const f of form.getAll("images")) {
    if (!(f instanceof File) || f.size === 0) continue;
    const problem = validateUpload(f, { allowPdf: false });
    if (problem) return { error: `${f.name}: ${problem}` };
    images.push(await saveUpload(f, "public/products"));
  }

  const values = {
    name, concern, price, salePrice,
    slug: slugify(str(form, "slug") || name),
    tagline: str(form, "tagline"), description: str(form, "description"), size: str(form, "size"),
    stock: int(form, "stock") ?? 0, lowStockAt: int(form, "lowStockAt") ?? 5,
    howToUse: str(form, "howToUse"), ingredients: str(form, "ingredients"),
    illustration: str(form, "illustration") || "pump", badge: str(form, "badge") || null,
    nafdacNo: str(form, "nafdacNo") || null, sort: int(form, "sort") ?? 0,
    active: form.get("active") === "on", featured: form.get("featured") === "on",
    images, updatedAt: new Date(),
  };
  try {
    if (existing) await db.update(schema.products).set(values).where(eq(schema.products.id, existing.id));
    else await db.insert(schema.products).values(values);
  } catch (e) {
    if (String(e).includes("products_slug_idx")) return { error: "Another product already uses that URL slug." };
    throw e;
  }
  revalidatePath("/", "layout");
  redirect("/admin/products?saved=1");
}

// ---------------------------------------------------------------- zones & settings

export async function saveZonesAction(form: FormData) {
  await requireAdmin();
  const db = await getDb();
  const zones = await db.select().from(schema.deliveryZones);
  for (const z of zones) {
    await db.update(schema.deliveryZones).set({
      fee: int(form, `fee_${z.code}`) ?? z.fee,
      eta: str(form, `eta_${z.code}`) || z.eta,
      covers: str(form, `covers_${z.code}`) || z.covers,
      active: form.get(`active_${z.code}`) === "on",
    }).where(eq(schema.deliveryZones.code, z.code));
  }
  await saveSetting("freeDeliveryAbove", int(form, "freeDeliveryAbove") ?? 0);
  revalidatePath("/", "layout");
  redirect("/admin/zones?saved=1");
}

export async function saveSettingsAction(form: FormData) {
  await requireAdmin("owner");
  const s = await getSettings();
  await saveSetting("bank", { bank: str(form, "bank"), accountName: str(form, "accountName"), accountNumber: str(form, "accountNumber") });
  await saveSetting("store", {
    ...s.store,
    whatsapp: normalizePhone(str(form, "whatsapp")) ?? s.store.whatsapp,
    instagram: str(form, "instagram").replace(/^@/, "") || s.store.instagram,
    nafdacNo: str(form, "nafdacNo") || s.store.nafdacNo,
    pickupAddress: str(form, "pickupAddress") || s.store.pickupAddress,
  });
  await saveSetting("announcement", str(form, "announcement"));
  await saveSetting("transferConfirmHours", int(form, "transferConfirmHours") ?? s.transferConfirmHours);
  revalidatePath("/", "layout");
  redirect("/admin/settings?saved=1");
}

/**
 * Sends a test message to the signed-in admin's own email or WhatsApp.
 * WhatsApp uses Meta's built-in "hello_world" template, which every new business account
 * has, so this works before our own templates are approved.
 */
export async function sendTestAction(_prev: unknown, form: FormData) {
  const me = await requireAdmin("owner");
  const channel = str(form, "channel");
  if (channel === "whatsapp") {
    if (!me.phone) return { channel, ok: false, message: "Add your WhatsApp number in the Admins list below first." };
    const r = await sendWhatsApp(me.phone, "hello_world", [], "en_US");
    return { channel, ok: r.ok, message: r.skipped ? "WhatsApp isn't configured (WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID)." : r.ok ? `Sent to ${me.phone}. Check your WhatsApp.` : explain(r.error) };
  }
  const r = await sendEmail(me.email, "Belladerma: test email", "<p>Email notifications are working. 🎉</p>");
  return { channel, ok: r.ok, message: r.skipped ? "Resend isn't configured (RESEND_API_KEY), so this was only printed in the server log." : r.ok ? `Sent to ${me.email}. Check your inbox (and spam).` : explain(r.error) };
}

function explain(error = "") {
  // Errors look like "<http status> <json body>". Pull out the provider's own code and message.
  let code: number | undefined;
  let detail = error;
  try {
    const body = JSON.parse(error.slice(error.indexOf("{")));
    code = body.error?.code;
    detail = body.error?.message ?? body.message ?? error;
  } catch { /* not JSON */ }
  const hint =
    code === 131030 ? "This number isn't on the test recipient list. Add it in Meta → WhatsApp → API Setup → To."
    : code === 190 ? "Meta rejected the access token (expired, revoked or pasted incorrectly). Generate a new one; for production use a permanent system-user token."
    : code === 100 ? "Meta rejected the request. Check WHATSAPP_PHONE_NUMBER_ID is the Phone number ID (not the WhatsApp Business Account ID)."
    : code === 132001 ? "Meta couldn't find that template for this number."
    : /domain is not verified|verify a domain/i.test(detail) ? "Verify the sender domain in Resend, or use onboarding@resend.dev for testing."
    : /only send testing emails/i.test(detail) ? "Resend test mode only sends to your own Resend account email until a domain is verified."
    : "";
  return `Failed: ${detail.slice(0, 300)}${hint ? ` → ${hint}` : ""}`;
}

export async function saveAdminAction(id: number | null, _prev: unknown, form: FormData) {
  const me = await requireAdmin("owner");
  const db = await getDb();
  const email = str(form, "email").toLowerCase();
  const phoneRaw = str(form, "phone");
  const phone = phoneRaw ? normalizePhone(phoneRaw) : null;
  if (phoneRaw && !phone) return { error: "Enter a valid Nigerian WhatsApp number." };
  const password = str(form, "password");
  const values = {
    name: str(form, "name") || email, email, phone,
    role: (str(form, "role") === "owner" ? "owner" : "staff") as "owner" | "staff",
    notify: form.get("notify") === "on",
    active: id === me.id ? true : form.get("active") === "on",
  };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email." };
  if (password && password.length < 10) return { error: "Password must be at least 10 characters." };
  try {
    if (id) {
      await db.update(schema.admins).set({ ...values, ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}) })
        .where(eq(schema.admins.id, id));
    } else {
      if (!password) return { error: "Set a password for the new admin." };
      await db.insert(schema.admins).values({ ...values, passwordHash: await bcrypt.hash(password, 10) });
    }
  } catch (e) {
    if (String(e).includes("admins_email_idx")) return { error: "An admin with that email already exists." };
    throw e;
  }
  revalidatePath("/admin/settings");
  return { ok: true };
}
