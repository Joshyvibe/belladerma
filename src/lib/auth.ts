import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { secretKey } from "./tokens";

const COOKIE = "bd_admin";
const MAX_AGE = 60 * 60 * 24 * 7;

export async function startSession(adminId: number) {
  const jwt = await new SignJWT({ sub: String(adminId) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .setAudience("admin-session")
    .sign(secretKey());
  (await cookies()).set(COOKIE, jwt, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: MAX_AGE,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export async function currentAdmin() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { audience: "admin-session" });
    const db = await getDb();
    const [admin] = await db.select().from(schema.admins).where(eq(schema.admins.id, Number(payload.sub)));
    return admin?.active ? admin : null;
  } catch {
    return null;
  }
}

/** Use at the top of every admin page and server action. */
export async function requireAdmin(role?: "owner") {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/login");
  if (role === "owner" && admin.role !== "owner") redirect("/admin?error=owner-only");
  return admin;
}

// Simple in-memory login throttle: 5 failures per 15 minutes per key.
// Good enough for a single server; swap for a DB/Redis counter if you scale out.
const attempts = new Map<string, { n: number; until: number }>();
export function loginThrottled(key: string) {
  const a = attempts.get(key);
  return !!a && a.n >= 5 && a.until > Date.now();
}
export function recordLoginFailure(key: string) {
  const a = attempts.get(key);
  const fresh = !a || a.until < Date.now();
  attempts.set(key, { n: fresh ? 1 : a!.n + 1, until: Date.now() + 15 * 60 * 1000 });
}
export const clearLoginFailures = (key: string) => attempts.delete(key);
