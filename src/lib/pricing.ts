// Pure pricing logic. The browser uses it for a live preview; the server re-runs it on
// fresh database rows when the order is placed, so the browser never decides a price.

export type PricedProduct = { id: number; name: string; size: string; price: number; salePrice: number | null; stock: number; active: boolean };
export type ZoneLite = { code: string; label: string; areas: string[]; states: string[]; isDefault: boolean; fee: number; eta: string; active: boolean };
export type Location = { state: string; area?: string | null };

export const unitPrice = (p: { price: number; salePrice: number | null }) =>
  p.salePrice != null && p.salePrice < p.price ? p.salePrice : p.price;

export function resolveZone(zones: ZoneLite[], loc: Location): ZoneLite | null {
  const active = zones.filter((z) => z.active);
  if (!loc.state) return null;
  if (loc.state === "Lagos") {
    if (!loc.area) return null;
    return active.find((z) => z.areas.includes(loc.area!)) ?? null;
  }
  return active.find((z) => z.states.includes(loc.state)) ?? active.find((z) => z.isDefault) ?? null;
}

export type Quote = {
  lines: { product: PricedProduct; qty: number; unit: number; list: number; total: number }[];
  subtotal: number;
  discount: number;
  zone: ZoneLite | null;
  deliveryFee: number | null;
  freeDelivery: boolean;
  total: number;
  problems: string[];
};

export function quote(
  items: { productId: number; qty: number }[],
  products: PricedProduct[],
  zones: ZoneLite[],
  loc: Location,
  freeDeliveryAbove: number,
): Quote {
  const problems: string[] = [];
  const lines: Quote["lines"] = [];
  for (const it of items) {
    const p = products.find((x) => x.id === it.productId);
    const qty = Math.max(1, Math.min(20, Math.floor(it.qty)));
    if (!p || !p.active) { problems.push("An item in your bag is no longer available."); continue; }
    if (p.stock < qty) problems.push(p.stock > 0 ? `Only ${p.stock} ${p.name} left.` : `${p.name} is sold out.`);
    const unit = unitPrice(p);
    lines.push({ product: p, qty, unit, list: p.price, total: unit * qty });
  }
  const subtotal = lines.reduce((s, l) => s + l.total, 0);
  const discount = lines.reduce((s, l) => s + (l.list - l.unit) * l.qty, 0);
  const zone = resolveZone(zones, loc);
  const freeDelivery = !!zone && zone.fee > 0 && freeDeliveryAbove > 0 && subtotal >= freeDeliveryAbove;
  const deliveryFee = zone ? (freeDelivery ? 0 : zone.fee) : null;
  return { lines, subtotal, discount, zone, deliveryFee, freeDelivery, total: subtotal + (deliveryFee ?? 0), problems };
}
