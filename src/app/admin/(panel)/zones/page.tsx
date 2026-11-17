import { asc } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getSettings } from "@/lib/settings";
import { saveZonesAction } from "../../actions";
import { SubmitButton } from "@/components/Loading";

export default async function Zones({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  const db = await getDb();
  const [zones, s] = await Promise.all([
    db.select().from(schema.deliveryZones).orderBy(asc(schema.deliveryZones.sort)),
    getSettings(),
  ]);
  return (
    <form action={saveZonesAction} className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl">Delivery fees</h1>
        <SubmitButton className="btn-primary btn-sm" pendingText="Saving…">Save</SubmitButton>
      </div>
      {saved && <p className="rounded-xl bg-mint p-3 text-sm text-green-deep">Saved. New orders use these fees.</p>}
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-cream text-left text-xs tracking-wider text-muted uppercase">
            <tr><th className="px-4 py-3">Zone</th><th>Shown to buyers as</th><th>Fee (₦)</th><th>Delivery time</th><th>On</th></tr>
          </thead>
          <tbody>
            {zones.map((z) => (
              <tr key={z.code} className="border-t border-line align-top">
                <td className="px-4 py-3"><b>{z.label}</b>
                  <div className="mt-1 max-w-56 text-xs text-muted">{z.areas.length ? `Lagos areas: ${z.areas.join(", ")}` : z.states.length ? `States: ${z.states.join(", ")}` : z.isDefault ? "Every state not listed elsewhere" : ""}</div>
                </td>
                <td className="py-2 pr-2"><input name={`covers_${z.code}`} defaultValue={z.covers} className="input py-2 text-sm" /></td>
                <td className="py-2 pr-2"><input name={`fee_${z.code}`} defaultValue={z.fee} inputMode="numeric" className="input w-28 py-2 text-sm" /></td>
                <td className="py-2 pr-2"><input name={`eta_${z.code}`} defaultValue={z.eta} className="input w-36 py-2 text-sm" /></td>
                <td className="py-3"><input type="checkbox" name={`active_${z.code}`} defaultChecked={z.active} className="h-4 w-4 accent-green" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card flex flex-wrap items-center gap-3 p-4 text-sm">
        <label htmlFor="free" className="font-semibold">Free delivery on orders above (₦)</label>
        <input id="free" name="freeDeliveryAbove" defaultValue={s.freeDeliveryAbove} inputMode="numeric" className="input w-32 py-2" />
        <span className="text-muted">Set 0 to turn off. Doesn&apos;t apply to pickup.</span>
      </div>
      <p className="text-xs text-muted">Changing which areas or states belong to a zone is a developer change for now (src/db/seed.ts), to keep the checkout lists clean.</p>
    </form>
  );
}
