import "server-only";
import crypto from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { appUrl } from "@/lib/app-url";

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET must be set (32+ chars)");
  return s;
}
export const secretKey = () => new TextEncoder().encode(secret());

/** Private link token for a buyer's order page. Deterministic so it can be re-sent. */
export function orderToken(ref: string) {
  return crypto.createHmac("sha256", secret()).update(`order:${ref}`).digest("base64url").slice(0, 24);
}
export function checkOrderToken(ref: string, token: string | undefined | null) {
  if (!token) return false;
  const a = Buffer.from(orderToken(ref));
  const b = Buffer.from(token);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
export const orderUrl = (ref: string, path = "") =>
  `${appUrl()}/order/${ref}${path}?t=${orderToken(ref)}`;

/** Signed, expiring, single-use link that lets an admin confirm/reject a transfer from WhatsApp or email. */
export type AdminAction = { orderId: number; action: "confirm" | "reject"; adminId: number };

export async function signAdminAction(a: AdminAction) {
  return new SignJWT({ ...a })
    .setProtectedHeader({ alg: "HS256" })
    .setJti(crypto.randomUUID())
    .setIssuedAt()
    .setExpirationTime("72h")
    .setAudience("admin-action")
    .sign(secretKey());
}

export async function readAdminAction(token: string) {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { audience: "admin-action" });
    return { ...(payload as unknown as AdminAction), jti: payload.jti! };
  } catch {
    return null;
  }
}
