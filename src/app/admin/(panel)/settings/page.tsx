import { asc } from "drizzle-orm";
import { getDb, schema, remoteDbEnabled } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { prettyPhone } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { saveSettingsAction } from "../../actions";
import { AdminRow } from "./AdminRow";
import { TestSend } from "./TestSend";
import { SubmitButton } from "@/components/Loading";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const me = await requireAdmin("owner");
  const { saved } = await searchParams;
  const db = await getDb();
  const [s, admins] = await Promise.all([getSettings(), db.select().from(schema.admins).orderBy(asc(schema.admins.id))]);
  const env = {
    payments: process.env.PAYMENT_PROVIDER || "mock",
    email: !!process.env.RESEND_API_KEY,
    whatsapp: !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
    storage: process.env.SUPABASE_URL ? "Supabase" : "Local disk",
    db: remoteDbEnabled() ? "Supabase Postgres" : "Local PGlite",
  };
  return (
    <div className="space-y-6">
      <h1 className="text-4xl">Settings</h1>
      {saved && <p className="rounded-xl bg-mint p-3 text-sm text-green-deep">Saved.</p>}

      <form action={saveSettingsAction} className="grid gap-5 lg:grid-cols-2">
        <section className="card space-y-3 p-5">
          <h2 className="text-2xl">Bank account (shown at checkout)</h2>
          <Field label="Bank" name="bank" value={s.bank.bank} />
          <Field label="Account name" name="accountName" value={s.bank.accountName} />
          <Field label="Account number" name="accountNumber" value={s.bank.accountNumber} />
          <Field label="We usually confirm transfers within (hours)" name="transferConfirmHours" value={String(s.transferConfirmHours)} />
        </section>
        <section className="card space-y-3 p-5">
          <h2 className="text-2xl">Store</h2>
          <Field label={`Store WhatsApp (now ${prettyPhone(s.store.whatsapp)})`} name="whatsapp" value={s.store.whatsapp} />
          <Field label="Instagram handle" name="instagram" value={s.store.instagram} />
          <Field label="NAFDAC registration no." name="nafdacNo" value={s.store.nafdacNo} />
          <Field label="Pickup address" name="pickupAddress" value={s.store.pickupAddress} />
          <Field label="Announcement bar (leave empty to hide)" name="announcement" value={s.announcement} />
        </section>
        <div className="lg:col-span-2"><SubmitButton className="btn-primary" pendingText="Saving…">Save settings</SubmitButton></div>
      </form>

      <section className="card p-5">
        <h2 className="text-2xl">Admins</h2>
        <p className="mt-1 text-sm text-muted">Admins with &quot;Alerts&quot; on get payment-confirmation requests and new-order alerts by email, and by WhatsApp when a number is set.</p>
        <div className="mt-3">
          {/* eslint-disable-next-line @typescript-eslint/no-unused-vars */}
          {admins.map(({ passwordHash, ...a }) => <AdminRow key={a.id} admin={a} isMe={a.id === me.id} />)}
          <AdminRow />
        </div>
      </section>

      <section className="card p-5 text-sm">
        <h2 className="text-2xl">Integrations</h2>
        <p className="mt-1 text-muted">Set by the developer in environment variables (see .env.example).</p>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          <li>Online payments: <b>{env.payments}</b>{env.payments === "mock" && <span className="text-danger"> (demo only)</span>}</li>
          <li className="space-y-1">
            <div>Email (Resend): <b>{env.email ? "key set" : "not set, logging to console"}</b>{env.email && <span className="text-muted"> · from {process.env.EMAIL_FROM}</span>}</div>
            <TestSend channel="email" label={`Send test email to ${me.email}`} enabled />
          </li>
          <li className="space-y-1">
            <div>WhatsApp Cloud API: <b>{env.whatsapp ? "key set" : "not set, email only"}</b></div>
            <TestSend channel="whatsapp" label={me.phone ? `Send test WhatsApp to ${me.phone}` : "Send test WhatsApp (add your number below)"} enabled={env.whatsapp && !!me.phone} />
          </li>
          <li>File storage: <b>{env.storage}</b></li>
          <li>Database: <b>{env.db}</b></li>
        </ul>
      </section>
    </div>
  );
}

function Field({ label, name, value }: { label: string; name: string; value: string }) {
  return <div><label className="label" htmlFor={name}>{label}</label><input id={name} name={name} defaultValue={value} className="input" /></div>;
}
