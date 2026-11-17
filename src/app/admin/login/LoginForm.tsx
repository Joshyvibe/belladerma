"use client";

import { useActionState } from "react";
import { loginAction } from "../actions";
import { Spinner } from "@/components/Loading";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="username" className="input" required /></div>
      <div><label className="label" htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="current-password" className="input" required /></div>
      {state?.error && <p className="text-sm text-danger" role="alert">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>{pending ? <><Spinner />Signing in…</> : "Sign in"}</button>
    </form>
  );
}
