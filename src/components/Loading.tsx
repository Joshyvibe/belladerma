"use client";

import { useFormStatus } from "react-dom";

/** Small inline spinner for buttons. Inherits the text colour. */
export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`animate-spin ${className}`} fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Full-area branded loader shown while a page is on its way (used by loading.tsx files). */
export function PageLoader({ message = "Loading…" }: { message?: string }) {
  return (
    <div className="grid min-h-[55vh] place-items-center px-4" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-4">
        <div className="relative grid h-16 w-16 place-items-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-mint" />
          <span className="serif relative grid h-14 w-14 place-items-center rounded-full bg-green text-xl font-bold text-white">BD</span>
        </div>
        <p className="text-sm text-muted">{message}</p>
      </div>
    </div>
  );
}

/**
 * Submit button for <form action={serverAction}>. Shows a spinner and disables itself while the
 * action runs, so nobody double-clicks "Confirm" or wonders whether anything happened.
 */
export function SubmitButton({ children, pendingText, className = "btn-primary", ...rest }:
  { children: React.ReactNode; pendingText?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending } = useFormStatus();
  return (
    <button {...rest} className={className} disabled={pending || rest.disabled} aria-busy={pending}>
      {pending ? <><Spinner />{pendingText ?? "Please wait…"}</> : children}
    </button>
  );
}
