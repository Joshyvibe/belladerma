import { asc } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { listProducts } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { onlinePaymentsEnabled } from "@/lib/payments";
import { CheckoutForm } from "./CheckoutForm";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const db = await getDb();
  const [products, zones, settings] = await Promise.all([
    listProducts(),
    db.select().from(schema.deliveryZones).orderBy(asc(schema.deliveryZones.sort)),
    getSettings(),
  ]);
  return (
    <div className="wrap py-8 md:py-12">
      <h1 className="text-5xl">Checkout</h1>
      <CheckoutForm
        products={products.map(({ id, name, size, price, salePrice, stock, active }) => ({ id, name, size, price, salePrice, stock, active }))}
        zones={zones}
        freeDeliveryAbove={settings.freeDeliveryAbove}
        whatsapp={settings.store.whatsapp}
        onlineEnabled={onlinePaymentsEnabled()}
      />
    </div>
  );
}
