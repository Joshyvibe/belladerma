import type { Order, OrderItem } from "@/db/schema";
import { formatDate, naira, prettyPhone } from "@/lib/format";
import type { Settings } from "@/lib/settings";

/** Printable delivery note. Shared by the buyer's page and the admin order page. */
export function DeliveryNote({ order, items, settings }: { order: Order; items: OrderItem[]; settings: Settings }) {
  const listTotal = items.reduce((s, i) => s + i.listPrice * i.qty, 0);
  return (
    <div className="card bg-white p-6 text-sm print:border-0 print:p-0">
      <div className="flex items-start justify-between gap-4 border-b-2 border-green pb-3">
        <div>
          <div className="serif text-2xl font-bold tracking-[.06em]">BELLADERMA</div>
          <div className="text-xs text-muted">NAFDAC Reg. No. {settings.store.nafdacNo}<br />WhatsApp {prettyPhone(settings.store.whatsapp)}</div>
        </div>
        <div className="text-right">
          <b>DELIVERY NOTE</b>
          <div className="text-xs text-muted">DN-{order.ref.slice(3)}<br />Order {order.ref}<br />{formatDate(order.paidAt ?? order.createdAt)}</div>
        </div>
      </div>
      <div className="my-4 grid grid-cols-2 gap-4">
        <div><div className="text-[11px] tracking-wider text-muted uppercase">Deliver to</div>{order.customerName}<br />{prettyPhone(order.phone)}{order.email && <><br />{order.email}</>}</div>
        <div><div className="text-[11px] tracking-wider text-muted uppercase">Address</div>{order.address}{order.area ? `, ${order.area}` : ""}, {order.state}
          <div className="mt-1 text-[11px] tracking-wider text-muted uppercase">Zone · ETA</div>{order.zoneLabel} · {order.eta}</div>
      </div>
      <table className="w-full">
        <thead><tr className="border-b border-line text-left text-xs text-muted uppercase"><th className="py-1.5">Item</th><th>Qty</th><th>Unit</th><th className="text-right">Total</th></tr></thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id} className="border-b border-line"><td className="py-1.5">{i.name}{i.size && <span className="text-muted"> · {i.size}</span>}</td><td>{i.qty}</td><td>{naira(i.listPrice)}</td><td className="text-right">{naira(i.listPrice * i.qty)}</td></tr>
          ))}
          {order.discount > 0 && <tr><td colSpan={3} className="py-1.5">Discount (sale)</td><td className="text-right">−{naira(order.discount)}</td></tr>}
          <tr><td colSpan={3} className="py-1.5">Subtotal</td><td className="text-right">{naira(listTotal - order.discount)}</td></tr>
          <tr><td colSpan={3} className="py-1.5">Logistics / delivery fee ({order.zoneLabel})</td><td className="text-right">{order.deliveryFee ? naira(order.deliveryFee) : "Free"}</td></tr>
          <tr className="border-t-2 border-green font-bold text-green-deep"><td colSpan={3} className="py-2">Total paid</td><td className="text-right">{naira(order.total)}</td></tr>
        </tbody>
      </table>
      <p className="mt-3 text-xs text-muted">
        Paid via {order.paymentMethod === "online" ? `online payment (${order.provider ?? "gateway"})` : "bank transfer"}{order.providerRef ? ` · Ref ${order.providerRef}` : ""}<br />
        Courier: {order.courier || "assigned at dispatch"}{order.tracking ? ` · Tracking ${order.tracking}` : ""}<br />
        Issues with your order? WhatsApp {prettyPhone(settings.store.whatsapp)}
      </p>
    </div>
  );
}
