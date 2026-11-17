import bcrypt from "bcryptjs";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import { CATALOG } from "./catalog";

type SeedDb = PostgresJsDatabase<typeof schema>;

const ZONES: (typeof schema.deliveryZones.$inferInsert)[] = [
  { code: "L1", label: "Lagos Island", covers: "VI, Ikoyi, Lagos Island, Obalende", fee: 2500, eta: "1 day", sort: 1,
    areas: ["Victoria Island", "Ikoyi", "Lagos Island", "Obalende"] },
  { code: "L2", label: "Lagos Mainland", covers: "Ikeja, Yaba, Surulere, Maryland, Gbagada…", fee: 2500, eta: "1 day", sort: 2,
    areas: ["Ikeja", "Yaba", "Surulere", "Maryland", "Ogba", "Gbagada", "Anthony", "Ojota", "Mushin", "Ilupeju", "Oshodi", "Isolo", "Festac", "Apapa", "Other Lagos area"] },
  { code: "L3", label: "Lekki / Ajah", covers: "Lekki Ph 1–2, Ajah, Sangotedo, Chevron", fee: 3500, eta: "1–2 days", sort: 3,
    areas: ["Lekki Phase 1", "Lekki Phase 2", "Chevron", "Ajah", "Sangotedo", "Ikota", "Osapa"] },
  { code: "L4", label: "Lagos outskirts", covers: "Ikorodu, Epe, Badagry, Alimosho fringes", fee: 4000, eta: "2 days", sort: 4,
    areas: ["Ikorodu", "Epe", "Badagry", "Ikotun", "Egbeda", "Igando", "Ojo", "Ibeju-Lekki"] },
  { code: "SW", label: "South-West", covers: "Ogun, Oyo, Osun, Ondo, Ekiti", fee: 5500, eta: "2–3 days", sort: 5,
    states: ["Ogun", "Oyo", "Osun", "Ondo", "Ekiti"] },
  { code: "NG", label: "Other states", covers: "Abuja, Port Harcourt, Enugu, Benin, etc.", fee: 7500, eta: "2–4 days", sort: 6, isDefault: true },
  { code: "FAR", label: "Far north / remote", covers: "North-East and North-West states", fee: 9000, eta: "3–5 days", sort: 7,
    states: ["Adamawa", "Bauchi", "Borno", "Gombe", "Taraba", "Yobe", "Jigawa", "Kano", "Kaduna", "Katsina", "Kebbi", "Sokoto", "Zamfara"] },
  { code: "PICKUP", label: "Store pickup (Lagos)", covers: "Collect from our Lagos store", fee: 0, eta: "Same / next day", sort: 8,
    areas: ["Store pickup"] },
];

export const DEFAULT_SETTINGS = {
  bank: { bank: "Demo Bank Plc (TBC)", accountName: "Belladerma Skincare Ltd (TBC)", accountNumber: "0000000000" },
  store: { whatsapp: "2349093793376", instagram: "belladermaskin", nafdacNo: "TBC", pickupAddress: "Lagos store address (TBC)" },
  announcement: "🌿 Enjoy 20% OFF all Belladerma skincare · Delivery across Nigeria",
  freeDeliveryAbove: 30000,
  transferConfirmHours: 4,
};

export async function seed(db: SeedDb, opts: { adminEmail: string; adminPassword: string }) {
  const existing = await db.select({ id: schema.admins.id }).from(schema.admins).limit(1);
  if (existing.length) return false;

  await db.insert(schema.products).values(CATALOG).onConflictDoNothing();
  await db.insert(schema.deliveryZones).values(ZONES).onConflictDoNothing();
  await db.insert(schema.settings).values(
    Object.entries(DEFAULT_SETTINGS).map(([key, value]) => ({ key, value })),
  ).onConflictDoNothing();
  await db.insert(schema.admins).values({
    email: opts.adminEmail.toLowerCase(), name: "Owner", role: "owner",
    passwordHash: await bcrypt.hash(opts.adminPassword, 10),
  });
  return true;
}
