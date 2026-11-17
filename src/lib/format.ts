// Shared by server and client code. No secrets here.

export const naira = (n: number) => "₦" + Math.round(n).toLocaleString("en-NG");

export const NIGERIAN_STATES = [
  "Lagos", "FCT (Abuja)", "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano",
  "Katsina", "Kebbi", "Kogi", "Kwara", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau",
  "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
] as const;

export const CONCERN_LABELS: Record<string, string> = {
  sun: "Sun protection",
  "dark-spots": "Dark spots & tone",
  acne: "Acne",
  cleanse: "Cleansers",
  barrier: "Moisture & barrier",
  body: "Body care",
};

/** Normalises Nigerian numbers to 234XXXXXXXXXX. Returns null if it doesn't look like one. */
export function normalizePhone(input: string): string | null {
  const d = input.replace(/[^\d]/g, "");
  let n = d;
  if (n.startsWith("0") && n.length === 11) n = "234" + n.slice(1);
  else if (n.length === 10 && /^[789]/.test(n)) n = "234" + n;
  return /^234[789][01]\d{8}$/.test(n) ? n : null;
}

export const prettyPhone = (e164: string) =>
  e164.startsWith("234") ? `+234 ${e164.slice(3, 6)} ${e164.slice(6, 9)} ${e164.slice(9)}` : e164;

export const waLink = (number: string, text?: string) =>
  `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

export const STATUS_LABELS: Record<string, { label: string; tone: "wait" | "ok" | "bad" | "info" }> = {
  PENDING_PAYMENT: { label: "Awaiting payment", tone: "wait" },
  AWAITING_TRANSFER: { label: "Awaiting transfer", tone: "wait" },
  AWAITING_CONFIRMATION: { label: "Confirming transfer", tone: "wait" },
  PAID: { label: "Paid", tone: "ok" },
  PROCESSING: { label: "Being packed", tone: "info" },
  DISPATCHED: { label: "On the way", tone: "info" },
  DELIVERED: { label: "Delivered", tone: "ok" },
  FAILED: { label: "Payment failed", tone: "bad" },
  ON_HOLD: { label: "On hold", tone: "bad" },
  REJECTED: { label: "Payment not confirmed", tone: "bad" },
  CANCELLED: { label: "Cancelled", tone: "bad" },
  REFUNDED: { label: "Refunded", tone: "bad" },
};

export const formatDate = (d: Date | string) =>
  new Date(d).toLocaleString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
