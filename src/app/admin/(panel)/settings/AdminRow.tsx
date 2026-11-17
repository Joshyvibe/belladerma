"use client";

import { useActionState } from "react";
import type { Admin } from "@/db/schema";
import { saveAdminAction } from "../../actions";
import { Spinner } from "@/components/Loading";

export function AdminRow({ admin, isMe }: { admin?: Omit<Admin, "passwordHash">; isMe?: boolean }) {
  const [state, action, pending] = useActionState(saveAdminAction.bind(null, admin?.id ?? null), undefined);
  return (
    <form action={action} className="grid gap-2 border-t border-line py-3 text-sm md:grid-cols-[1fr_1.3fr_1fr_.8fr_1fr_auto] md:items-center">
      <input name="name" defaultValue={admin?.name} placeholder="Name" className="input py-2 text-sm" />
      <input name="email" defaultValue={admin?.email} placeholder="Email" className="input py-2 text-sm" required />
      <input name="phone" defaultValue={admin?.phone ?? ""} placeholder="WhatsApp no." className="input py-2 text-sm" />
      <select name="role" defaultValue={admin?.role ?? "staff"} className="input py-2 text-sm" disabled={isMe}>
        <option value="staff">Staff</option><option value="owner">Owner</option>
      </select>
      {isMe && <input type="hidden" name="role" value="owner" />}
      <input name="password" type="password" placeholder={admin ? "New password (optional)" : "Password"} autoComplete="new-password" className="input py-2 text-sm" />
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="notify" defaultChecked={admin?.notify ?? true} className="accent-green" />Alerts</label>
        {!isMe && <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="active" defaultChecked={admin?.active ?? true} className="accent-green" />Active</label>}
        <button className="btn-ghost btn-sm" disabled={pending}>{pending ? <><Spinner />Saving…</> : admin ? "Save" : "Add"}</button>
      </div>
      {state?.error && <p className="text-danger md:col-span-6">{state.error}</p>}
      {state?.ok && <p className="text-green-soft md:col-span-6">Saved.</p>}
    </form>
  );
}
