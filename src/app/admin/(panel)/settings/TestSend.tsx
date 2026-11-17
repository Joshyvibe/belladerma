"use client";

import { useActionState } from "react";
import { sendTestAction } from "../../actions";
import { Spinner } from "@/components/Loading";

export function TestSend({ channel, label, enabled }: { channel: "email" | "whatsapp"; label: string; enabled: boolean }) {
  const [state, action, pending] = useActionState(sendTestAction, undefined);
  return (
    <form action={action} className="space-y-1">
      <input type="hidden" name="channel" value={channel} />
      <button className="btn-ghost btn-sm" disabled={pending || !enabled}>{pending ? <><Spinner />Sending…</> : label}</button>
      {state && <p className={`text-xs ${state.ok ? "text-green-soft" : "text-danger"}`}>{state.message}</p>}
    </form>
  );
}
