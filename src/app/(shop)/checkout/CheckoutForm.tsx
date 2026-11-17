"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { useCart } from "@/components/cart";
import { naira, NIGERIAN_STATES, waLink } from "@/lib/format";
import { quote, type PricedProduct, type ZoneLite } from "@/lib/pricing";
import { placeOrderAction } from "./actions";
import { Spinner } from "@/components/Loading";

type Props = { products: PricedProduct[]; zones: ZoneLite[]; freeDeliveryAbove: number; whatsapp: string; onlineEnabled: boolean };

export function CheckoutForm({ products, zones, freeDeliveryAbove, whatsapp, onlineEnabled }: Props) {
  const { lines, setQty, clear } = useCart();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [f, setF] = useState({ name: "", phone: "", email: "", state: "", area: "", address: "", paymentMethod: "transfer" as "online" | "transfer" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  const items = lines.map((l) => ({ productId: l.productId, qty: l.qty }));
  const q = useMemo(() => quote(items, products, zones, { state: f.state, area: f.area }, freeDeliveryAbove),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lines, f.state, f.area, products, zones, freeDeliveryAbove]);
  const lagosAreas = zones.filter((z) => z.active && z.areas.length).flatMap((z) => z.areas.map((a) => ({ a, zone: z.label })));
  const pickup = q.zone?.code === "PICKUP";
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setF({ ...f, [k]: e.target.value, ...(k === "state" ? { area: "" } : {}) });
    setErrors({ ...errors, [k]: "" });
  };

  if (lines.length === 0) {
    return (
      <div className="card mt-6 p-8 text-center">
        <p className="text-muted">Your bag is empty.</p>
        <Link href="/#shop" className="btn-primary mt-4">Browse products</Link>
      </div>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    start(async () => {
      const res = await placeOrderAction({ ...f, items, area: f.state === "Lagos" ? f.area : null } as Parameters<typeof placeOrderAction>[0]);
      if (!res.ok) { setError(res.error); setErrors(res.fields ?? {}); return; }
      clear();
      router.push(res.redirect);
    });
  };

  const fieldErr = (k: string) => errors[k] && <p className="mt-1 text-sm text-danger">{errors[k]}</p>;

  return (
    <form onSubmit={submit} className="mt-6 grid gap-8 lg:grid-cols-[1.3fr_1fr]">
      <div className="space-y-8">
        <fieldset className="card space-y-4 p-5">
          <legend className="serif px-1 text-2xl">1. Your details</legend>
          <div><label className="label" htmlFor="name">Full name</label><input id="name" className="input" autoComplete="name" value={f.name} onChange={set("name")} required />{fieldErr("name")}</div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label" htmlFor="phone">WhatsApp phone</label><input id="phone" className="input" type="tel" inputMode="tel" placeholder="0803 123 4567" autoComplete="tel" value={f.phone} onChange={set("phone")} required />{fieldErr("phone")}</div>
            <div><label className="label" htmlFor="email">Email</label><input id="email" className="input" type="email" autoComplete="email" value={f.email} onChange={set("email")} required />{fieldErr("email")}</div>
          </div>
          <p className="text-xs text-muted">We send your order updates and delivery note by email and WhatsApp.</p>
        </fieldset>

        <fieldset className="card space-y-4 p-5">
          <legend className="serif px-1 text-2xl">2. Delivery</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="state">State</label>
              <select id="state" className="input" value={f.state} onChange={set("state")} required>
                <option value="">Select state</option>
                {NIGERIAN_STATES.map((s) => <option key={s}>{s}</option>)}
              </select>{fieldErr("state")}
            </div>
            {f.state === "Lagos" && (
              <div>
                <label className="label" htmlFor="area">Area in Lagos</label>
                <select id="area" className="input" value={f.area} onChange={set("area")} required>
                  <option value="">Select area</option>
                  {lagosAreas.map(({ a }) => <option key={a}>{a}</option>)}
                </select>
              </div>
            )}
          </div>
          {!pickup && (
            <div><label className="label" htmlFor="address">Delivery address</label><textarea id="address" className="input" rows={2} autoComplete="street-address" placeholder="House number, street, landmark" value={f.address} onChange={set("address")} />{fieldErr("address")}</div>
          )}
          {q.zone && <p className="rounded-xl bg-mint px-4 py-3 text-sm text-green-deep">{q.zone.label}: {q.deliveryFee ? naira(q.deliveryFee) : "Free"} · arrives in {q.zone.eta}</p>}
        </fieldset>

        <fieldset className="card space-y-3 p-5">
          <legend className="serif px-1 text-2xl">3. Payment</legend>
          {([
            ["transfer", "Transfer to Belladerma's account", "You'll get our account details and an order reference. We confirm your payment, usually within a few hours.", null, true],
            ["online", "Pay online", onlineEnabled
              ? "Card, bank transfer or USSD. Confirmed instantly."
              : "Card, USSD and instant bank payment will be switched on when we finalise the payment gateway.",
              onlineEnabled ? "Instant" : "Coming soon", onlineEnabled],
          ] as const).map(([v, t, d, tag, enabled]) => (
            <label key={v} className={`flex gap-3 rounded-xl border-[1.5px] p-4 ${!enabled ? "cursor-not-allowed border-dashed border-line opacity-70" : f.paymentMethod === v ? "cursor-pointer border-green bg-[#f3faf7]" : "cursor-pointer border-line"}`}>
              <input type="radio" name="pm" className="mt-1 h-4 w-4 accent-green" checked={f.paymentMethod === v} disabled={!enabled} onChange={() => setF({ ...f, paymentMethod: v })} />
              <span><b>{t}</b>{tag && <span className="chip ml-2 bg-gold-soft text-gold-ink">{tag}</span>}<br /><span className="text-sm text-muted">{d}</span></span>
            </label>
          ))}
        </fieldset>
      </div>

      <aside className="h-fit space-y-4 lg:sticky lg:top-24">
        <div className="card p-5">
          <h2 className="text-2xl">Order summary</h2>
          <div className="mt-3 divide-y divide-line">
            {q.lines.map((l) => (
              <div key={l.product.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <div className="font-semibold">{l.product.name}</div>
                  <div className="mt-1 flex items-center gap-2 text-muted">
                    <button type="button" className="h-6 w-6 rounded border border-line" onClick={() => setQty(l.product.id, l.qty - 1)} aria-label="Decrease">−</button>
                    {l.qty}
                    <button type="button" className="h-6 w-6 rounded border border-line" onClick={() => setQty(l.product.id, l.qty + 1)} aria-label="Increase">+</button>
                    × {naira(l.unit)}
                  </div>
                </div>
                <span className="font-semibold">{naira(l.total)}</span>
              </div>
            ))}
          </div>
          <dl className="mt-2 space-y-1.5 border-t border-dashed border-line pt-3 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{naira(q.subtotal)}</dd></div>
            {q.discount > 0 && <div className="flex justify-between text-green-soft"><dt>You save</dt><dd>−{naira(q.discount)}</dd></div>}
            <div className="flex justify-between"><dt>Delivery</dt><dd>{q.zone ? (q.deliveryFee ? naira(q.deliveryFee) : "Free") : "Choose location"}</dd></div>
            <div className="flex justify-between border-t border-dashed border-line pt-2 text-lg font-bold text-green-deep"><dt>Total</dt><dd>{naira(q.total)}</dd></div>
          </dl>
          {freeDeliveryAbove > 0 && q.zone && !pickup && !q.freeDelivery && (
            <p className="mt-2 text-xs text-green-soft">Add {naira(freeDeliveryAbove - q.subtotal)} more for free delivery.</p>
          )}
          {q.problems.length > 0 && <p className="mt-3 text-sm text-danger">{q.problems.join(" ")}</p>}
          {error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-danger" role="alert">{error}</p>}
          <button className="btn-primary mt-4 w-full" disabled={pending || !q.zone || q.problems.length > 0}>
            {pending ? <><Spinner />Placing order…</> : f.paymentMethod === "online" ? `Pay ${naira(q.total)}` : "Place order & get bank details"}
          </button>
        </div>
        <p className="text-center text-sm text-muted">Prefer to chat? <a className="underline" href={waLink(whatsapp, "Hi Belladerma, I'd like to place an order")}>Order on WhatsApp</a></p>
      </aside>
    </form>
  );
}
