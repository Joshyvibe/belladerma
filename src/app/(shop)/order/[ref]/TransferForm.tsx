"use client";

import { useActionState, useState } from "react";
import { Spinner } from "@/components/Loading";

export function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="btn-ghost btn-sm" onClick={() => navigator.clipboard?.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); })}>
      {done ? "Copied" : "Copy"}
    </button>
  );
}

export function TransferForm({ action }: { action: (prev: unknown, form: FormData) => Promise<{ error?: string } | void> }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label className="label" htmlFor="receipt">Upload receipt <span className="font-normal text-muted">(optional, speeds things up)</span></label>
        <input id="receipt" name="receipt" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="input text-sm" />
      </div>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>{pending ? <><Spinner />Sending…</> : "I've made the transfer"}</button>
    </form>
  );
}
