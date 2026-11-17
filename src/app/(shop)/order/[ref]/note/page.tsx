import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { DeliveryNote } from "@/components/DeliveryNote";
import { PrintButton } from "@/components/PrintButton";
import { getOrder } from "@/lib/orders";
import { getSettings } from "@/lib/settings";
import { checkOrderToken } from "@/lib/tokens";

export const metadata = { title: "Delivery note", robots: { index: false } };
const PAID_STATES = ["PAID", "PROCESSING", "DISPATCHED", "DELIVERED"];

export default async function NotePage({ params, searchParams }: { params: Promise<{ ref: string }>; searchParams: Promise<{ t?: string }> }) {
  const { ref } = await params;
  const { t } = await searchParams;
  if (!checkOrderToken(ref, t)) notFound();
  const order = await getOrder({ ref });
  // The delivery note exists only once the order is paid.
  if (!order || !PAID_STATES.includes(order.status)) notFound();
  const db = await getDb();
  const items = await db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, order.id));
  return (
    <div className="wrap max-w-3xl py-8">
      <div className="no-print mb-4 flex justify-between gap-3">
        <Link href={`/order/${ref}?t=${t}`} className="btn-ghost btn-sm">← Back to order</Link>
        <PrintButton />
      </div>
      <DeliveryNote order={order} items={items} settings={await getSettings()} />
    </div>
  );
}
