import {
  pgTable, serial, text, integer, boolean, timestamp, jsonb, index, uniqueIndex,
} from "drizzle-orm/pg-core";

// All money is stored as whole naira (integers). Paystack amounts are converted to kobo at the edge.

export const CONCERNS = ["sun", "dark-spots", "acne", "cleanse", "barrier", "body"] as const;
export type Concern = (typeof CONCERNS)[number];

export const ORDER_STATUSES = [
  "PENDING_PAYMENT", "AWAITING_TRANSFER", "AWAITING_CONFIRMATION",
  "PAID", "PROCESSING", "DISPATCHED", "DELIVERED",
  "FAILED", "ON_HOLD", "REJECTED", "CANCELLED", "REFUNDED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  concern: text("concern").$type<Concern>().notNull(),
  tagline: text("tagline").notNull().default(""),
  description: text("description").notNull().default(""),
  size: text("size").notNull().default(""),
  price: integer("price").notNull(),
  salePrice: integer("sale_price"),
  stock: integer("stock").notNull().default(0),
  lowStockAt: integer("low_stock_at").notNull().default(5),
  howToUse: text("how_to_use").notNull().default(""),
  ingredients: text("ingredients").notNull().default(""),
  images: jsonb("images").$type<string[]>().notNull().default([]),
  // Used when there are no photos yet: pump | dropper | tube | jar
  illustration: text("illustration").notNull().default("pump"),
  badge: text("badge"),
  nafdacNo: text("nafdac_no"),
  active: boolean("active").notNull().default(true),
  featured: boolean("featured").notNull().default(false),
  sort: integer("sort").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("products_slug_idx").on(t.slug)]);

export const deliveryZones = pgTable("delivery_zones", {
  code: text("code").primaryKey(),
  label: text("label").notNull(),
  covers: text("covers").notNull().default(""),
  // A zone matches either a list of Lagos areas or a list of states.
  areas: jsonb("areas").$type<string[]>().notNull().default([]),
  states: jsonb("states").$type<string[]>().notNull().default([]),
  isDefault: boolean("is_default").notNull().default(false), // catch-all for unlisted states
  fee: integer("fee").notNull(),
  eta: text("eta").notNull(),
  active: boolean("active").notNull().default(true),
  sort: integer("sort").notNull().default(0),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  ref: text("ref").notNull(),
  status: text("status").$type<OrderStatus>().notNull(),
  customerName: text("customer_name").notNull(),
  phone: text("phone").notNull(), // E.164 without +, e.g. 2348031234567
  email: text("email"),
  address: text("address").notNull().default(""),
  state: text("state").notNull(),
  area: text("area"),
  zoneCode: text("zone_code").notNull(),
  zoneLabel: text("zone_label").notNull(),
  eta: text("eta").notNull(),
  subtotal: integer("subtotal").notNull(),
  discount: integer("discount").notNull().default(0),
  deliveryFee: integer("delivery_fee").notNull(),
  total: integer("total").notNull(),
  currency: text("currency").notNull().default("NGN"),
  paymentMethod: text("payment_method").$type<"online" | "transfer">().notNull(),
  provider: text("provider"),
  providerRef: text("provider_ref"),
  receiptPath: text("receipt_path"),
  transferClaimedAt: timestamp("transfer_claimed_at", { withTimezone: true }),
  remindedAt: timestamp("reminded_at", { withTimezone: true }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  confirmedBy: text("confirmed_by"),
  courier: text("courier"),
  tracking: text("tracking"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("orders_ref_idx").on(t.ref),
  index("orders_status_idx").on(t.status, t.createdAt),
  index("orders_phone_idx").on(t.phone),
]);

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  size: text("size").notNull().default(""),
  listPrice: integer("list_price").notNull(),
  unitPrice: integer("unit_price").notNull(),
  qty: integer("qty").notNull(),
}, (t) => [index("order_items_order_idx").on(t.orderId)]);

// Audit trail: every status change, note and notification for an order.
export const orderEvents = pgTable("order_events", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  actor: text("actor").notNull(), // system | customer | provider | admin:<email>
  type: text("type").notNull(),   // status | note | notification | payment
  fromStatus: text("from_status"),
  toStatus: text("to_status"),
  note: text("note"),
  data: jsonb("data"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("order_events_order_idx").on(t.orderId, t.createdAt)]);

// Raw provider webhooks. The unique event id drops duplicate deliveries.
export const paymentEvents = pgTable("payment_events", {
  id: serial("id").primaryKey(),
  provider: text("provider").notNull(),
  eventId: text("event_id").notNull(),
  orderRef: text("order_ref"),
  type: text("type").notNull(),
  payload: jsonb("payload").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("payment_events_provider_event_idx").on(t.provider, t.eventId)]);

export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  phone: text("phone"), // receives WhatsApp alerts when notify = true
  passwordHash: text("password_hash").notNull(),
  role: text("role").$type<"owner" | "staff">().notNull().default("staff"),
  notify: boolean("notify").notNull().default(true),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("admins_email_idx").on(t.email)]);

// One-tap admin links from WhatsApp/email are single use.
export const usedActionTokens = pgTable("used_action_tokens", {
  jti: text("jti").primaryKey(),
  usedAt: timestamp("used_at", { withTimezone: true }).notNull().defaultNow(),
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
});

export type Product = typeof products.$inferSelect;
export type DeliveryZone = typeof deliveryZones.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type OrderEvent = typeof orderEvents.$inferSelect;
export type Admin = typeof admins.$inferSelect;
